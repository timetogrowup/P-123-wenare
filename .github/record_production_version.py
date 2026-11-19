"""Record the runtime tree of a confirmed GitHub Pages publication."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import tempfile
from urllib.parse import quote
from urllib.request import Request, urlopen

RUNTIME_SUFFIXES = {".html", ".js", ".css", ".json", ".webmanifest", ".svg", ".png",
                    ".ico", ".webp", ".jpg", ".jpeg", ".woff", ".woff2", ".wasm"}
BRANCH = "suivi-production"
PROBES = ("index.html", "sw.js", "distribution/manifest.json",
          "distribution/timetable/manifest.json", "distribution/mobility/manifest.json",
          "distribution/opportunities/manifest.json")


def git(*args, cwd=None):
    return subprocess.check_output(["git", *args], cwd=cwd)


def payload(url, headers=None):
    with urlopen(Request(url, headers=headers or {}), timeout=30) as response:
        return response.read()


def published_run(repo):
    headers = {"Authorization": "Bearer " + os.environ["GH_TOKEN"],
               "Accept": "application/vnd.github+json"}
    for page in range(1, 100):
        url = (f"https://api.github.com/repos/{repo}/actions/runs"
               f"?branch=main&status=success&per_page=100&page={page}")
        runs = json.loads(payload(url, headers))["workflow_runs"]
        for run in runs:
            if run["name"] == "pages build and deployment":
                return run
        if len(runs) < 100:
            break
    raise RuntimeError("Aucun déploiement Pages réussi sur main")


def runtime_path(path):
    p = PurePosixPath(path)
    return (p.parts[0] in {"distribution", "vendor"}
            or len(p.parts) == 1 and (p.suffix in RUNTIME_SUFFIXES or path == "CONFIDENTIALITE.md"))


def inventory(commit):
    files = {}
    for entry in git("ls-tree", "-rz", "--full-tree", commit).split(b"\0"):
        if not entry:
            continue
        metadata, raw_path = entry.split(b"\t", 1)
        mode, kind, oid = metadata.decode().split()
        path = raw_path.decode()
        if runtime_path(path):
            if kind != "blob" or mode not in {"100644", "100755"}:
                raise RuntimeError(f"Fichier de production non pris en charge : {path}")
            files[path] = oid
    if not set(PROBES).issubset(files):
        raise RuntimeError("Inventaire incomplet : fichiers de contrôle manquants")
    return files


def encoded(files):
    return (json.dumps(files, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode()


def run(repo, site, date, run_url):
    deployment = published_run(repo)
    commit = deployment["head_sha"]
    git("fetch", "--no-tags", "--depth=1", "origin", commit)
    files = inventory(commit)
    for path in PROBES:
        live = payload(site.rstrip("/") + "/" + quote(path) + "?releve=" + quote(run_url.rsplit("/", 1)[-1]),
                       {"Cache-Control": "no-cache"})
        if live != git("cat-file", "blob", files[path]):
            raise RuntimeError(f"La production et le déploiement GitHub diffèrent : {path}")
    if published_run(repo)["head_sha"] != commit:
        raise RuntimeError("Un nouveau déploiement a abouti pendant le relevé")

    digest = hashlib.sha256(encoded(files)).hexdigest()
    with tempfile.TemporaryDirectory() as tmp:
        remote = f"refs/heads/{BRANCH}"
        existing = git("ls-remote", "--heads", "origin", remote).strip()
        if existing:
            git("fetch", "--no-tags", "origin", remote)
            git("worktree", "add", "--detach", tmp, "FETCH_HEAD")
        else:
            git("worktree", "add", "--detach", tmp, commit)
        try:
            if not existing:
                git("switch", "--orphan", BRANCH, cwd=tmp)
            base = Path(tmp)
            journal = base / "VERSIONS_PRODUCTION.json"
            versions = json.loads(journal.read_text()) if journal.exists() else []
            if versions and versions[-1]["empreinte"] == digest:
                print("Aucun changement : aucune nouvelle version.")
                return
            number = len(versions) + 1
            tag = f"production-v{number:06}"
            path = Path("inventaires") / f"v{number:06}.json"
            (base / path).parent.mkdir(exist_ok=True)
            (base / path).write_bytes(encoded(files))
            versions.append({"version": number, "date_releve_utc": date,
                             "commit": commit, "tag": tag,
                             "deploiement": deployment["html_url"], "releve": run_url,
                             "empreinte": digest, "inventaire": str(path), "fichiers": len(files)})
            journal.write_text(json.dumps(versions, ensure_ascii=False, indent=2) + "\n")
            git("add", "--", journal.name, str(path), cwd=tmp)
            git("commit", "-m", f"Enregistrer WENARE en production v{number:06}", cwd=tmp)
            git("push", "--atomic", "origin", f"HEAD:{remote}",
                f"{commit}:refs/tags/{tag}", cwd=tmp)
            print(f"Version {tag} enregistrée ({len(files)} fichiers).")
        finally:
            git("worktree", "remove", "--force", tmp)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    for field in ("repo", "site", "date", "run-url"):
        parser.add_argument("--" + field, required=True)
    run(**vars(parser.parse_args()))
