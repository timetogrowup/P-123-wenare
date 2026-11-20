(function () {
  'use strict';

  const variant = document.documentElement.dataset.variant || 'a';
  const $ = id => document.getElementById(id);
  const modal = $('projectionDialog');
  const body = $('dialogBody');
  const status = $('modalStatus');
  const plus = $('openPlus');
  let favorites = [
    { id: 1, name: 'La Défense' },
    { id: 2, name: 'Poissy' },
    { id: 3, name: 'Auber' }
  ];
  let selectedId = 1;
  let nextId = 4;
  let tab = 'places';
  let step = 0;
  let mode = 'now';

  function parisParts() {
    const pieces = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const p = {};
    for (const item of pieces) if (item.type !== 'literal') p[item.type] = item.value;
    return { date: p.year + '-' + p.month + '-' + p.day, time: p.hour + ':' + p.minute };
  }
  const clock = parisParts();
  let chosenDate = clock.date;
  let chosenTime = clock.time;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }
  function chosenPlace() {
    return favorites.find(item => item.id === selectedId);
  }
  function announce(message, error) {
    status.textContent = message || '';
    status.classList.toggle('is-error', Boolean(error));
  }
  function placeMarkup() {
    let rows = favorites.map(item => '<label class="place-choice">' +
      '<input type="radio" name="destination" value="' + item.id + '"' +
      (item.id === selectedId ? ' checked' : '') + '>' +
      '<span>' + escapeHtml(item.name) + '</span></label>').join('');
    if (!favorites.length) rows = '<p class="hint">Aucun lieu : ajoutez un nom fictif ci-dessous.</p>';
    return '<section class="edit-area" aria-label="Lieux habituels">' +
      '<h3>Mes lieux habituels</h3>' +
      '<div class="places-list">' + rows + '</div>' +
      '<label for="placeName">Ajouter ou renommer un lieu</label>' +
      '<input id="placeName" type="text" maxlength="90" placeholder="Ex. : Opéra" autocomplete="off">' +
      '<div class="actions compact">' +
      '<button type="button" data-action="add" class="secondary">Ajouter</button>' +
      '<button type="button" data-action="rename" class="secondary"' + (!chosenPlace() ? ' disabled' : '') + '>Renommer</button>' +
      '<button type="button" data-action="remove" class="danger"' + (!chosenPlace() ? ' disabled' : '') + '>Supprimer</button>' +
      '</div><p class="hint">Lieux fictifs, uniquement dans cette page de démonstration.</p></section>';
  }
  function timeMarkup() {
    return '<section class="edit-area" aria-label="Choisir un moment">' +
      '<h3>À quel moment ?</h3>' +
      '<div class="moment-modes">' +
      '<label><input type="radio" name="moment" value="now"' + (mode === 'now' ? ' checked' : '') + '> Maintenant</label>' +
      '<label><input type="radio" name="moment" value="custom"' + (mode === 'custom' ? ' checked' : '') + '> Date et heure précises</label>' +
      '</div>' +
      (mode === 'custom' ? '<div class="date-fields">' +
        '<label for="chosenDate">Date <input id="chosenDate" type="date" value="' + escapeHtml(chosenDate) + '" required></label>' +
        '<label for="chosenTime">Heure de Paris <input id="chosenTime" type="time" step="60" value="' + escapeHtml(chosenTime) + '" required></label></div>' : '') +
      '<p class="hint">Heure de Paris. Cette maquette ne charge aucun horaire de transport.</p></section>';
  }
  function recap() {
    const place = chosenPlace();
    const when = mode === 'now' ? 'maintenant' :
      (chosenDate && chosenTime ? chosenDate.split('-').reverse().join('/') + ' à ' + chosenTime : 'date et heure à renseigner');
    return '<p class="recap"><strong>Projection préparée :</strong> <span class="selection-preview">' +
      escapeHtml(place ? place.name : 'Choisir un lieu') + ' · ' + escapeHtml(when) + '</span></p>';
  }
  function applyButton() {
    return '<button type="button" class="primary" data-action="apply"' +
      (!chosenPlace() ? ' disabled' : '') + '>Explorer à ce lieu et ce moment</button>';
  }
  function render() {
    announce('');
    if (variant === 'a') {
      body.innerHTML = '<div class="tabs" role="tablist" aria-label="Choix de la rubrique">' +
        '<button type="button" data-action="tab-places" role="tab" aria-selected="' + (tab === 'places') + '">1. Mes lieux</button>' +
        '<button type="button" data-action="tab-time" role="tab" aria-selected="' + (tab === 'time') + '">2. Date et heure</button>' +
        '</div><div role="tabpanel" class="tab-panel">' +
        (tab === 'places' ? placeMarkup() : timeMarkup()) +
        '</div>' + recap() + '<div class="actions">' + applyButton() + '</div>';
    } else if (variant === 'b') {
      body.innerHTML = '<div class="single-view">' + placeMarkup() + timeMarkup() +
        '</div>' + recap() + '<div class="actions">' + applyButton() + '</div>';
    } else {
      body.innerHTML = '<p class="step-indicator">Étape ' + (step + 1) + ' sur 2 — ' +
        (step === 0 ? 'choisir un lieu' : 'choisir un moment') + '</p>' +
        (step === 0 ? placeMarkup() : timeMarkup()) + recap() +
        '<div class="actions">' +
        (step === 0 ? '<button type="button" class="primary" data-action="next"' +
          (!chosenPlace() ? ' disabled' : '') + '>Continuer : date et heure</button>' :
          '<button type="button" data-action="back" class="secondary">Retour aux lieux</button>' + applyButton()) +
        '</div>';
    }
  }
  function validDateAndTime() {
    if (mode === 'now') return true;
    if (!/^\d{4}-\d\d-\d\d$/.test(chosenDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(chosenTime)) return false;
    const a = chosenDate.split('-').map(Number);
    const d = new Date(Date.UTC(a[0], a[1] - 1, a[2]));
    return d.getUTCFullYear() === a[0] && d.getUTCMonth() + 1 === a[1] && d.getUTCDate() === a[2];
  }
  function project() {
    const place = chosenPlace();
    if (!place) return announce('Choisissez d’abord un lieu.', true);
    if (!validDateAndTime()) return announce('Indiquez une date et une heure valides.', true);
    const current = parisParts();
    const when = mode === 'now' ? 'maintenant' : chosenDate.split('-').reverse().join('/') + ' à ' + chosenTime;
    $('situation').textContent = 'Je serai à ' + place.name + ' · ' + when;
    $('projectedState').textContent = 'Téléportation de démonstration active : ' + place.name + ' · ' + when +
      '. Aucun départ réel n’est calculé.';
    $('wenareHeader').dataset.teleportation = 'true';
    modal.close();
    $('projectedState').focus();
  }
  function openModal() {
    step = 0;
    tab = 'places';
    render();
    if (typeof modal.showModal === 'function') modal.showModal();
    else modal.setAttribute('open', '');
    $('dialogTitle').focus();
  }
  plus.addEventListener('click', openModal);
  $('closeDialog').addEventListener('click', () => modal.close());
  modal.addEventListener('close', () => plus.focus({ preventScroll: true }));
  $('returnToPosition').addEventListener('click', () => {
    $('situation').textContent = 'Je suis ici, il est maintenant l’heure actuelle';
    $('projectedState').textContent = 'Contexte de démonstration : ici et maintenant. Le GPS réel n’est pas utilisé.';
    $('wenareHeader').dataset.teleportation = 'false';
    $('projectedState').focus();
  });
  $('openSettings').addEventListener('click', () => {
    const dark = document.body.classList.toggle('night');
    $('openSettings').setAttribute('aria-pressed', String(dark));
    $('settingsMessage').textContent = dark ? 'Thème sombre activé.' : 'Thème clair activé.';
  });
  for (const button of document.querySelectorAll('[data-radius]')) {
    button.addEventListener('click', () => {
      for (const b of document.querySelectorAll('[data-radius]')) b.setAttribute('aria-pressed', String(b === button));
      $('radiusMessage').textContent = 'Rayon de démonstration : ' + button.dataset.radius + ' m';
    });
  }
  modal.addEventListener('change', event => {
    const el = event.target;
    if (el.name === 'destination') {
      selectedId = Number(el.value);
      const summary = body.querySelector('.selection-preview');
      if (summary) summary.textContent = (chosenPlace() ? chosenPlace().name : 'Choisir un lieu') +
        ' · ' + (mode === 'now' ? 'maintenant' : chosenDate + ' à ' + chosenTime);
    } else if (el.name === 'moment') {
      mode = el.value;
      render();
      if (mode === 'custom') $('chosenDate')?.focus();
    } else if (el.id === 'chosenDate') {
      chosenDate = el.value;
    } else if (el.id === 'chosenTime') {
      chosenTime = el.value;
    }
  });
  modal.addEventListener('input', event => {
    const el = event.target;
    if (el.id === 'chosenDate') chosenDate = el.value;
    if (el.id === 'chosenTime') chosenTime = el.value;
    if (el.id === 'chosenDate' || el.id === 'chosenTime') {
      const sum = body.querySelector('.selection-preview');
      if (sum) sum.textContent = (chosenPlace()?.name || 'Choisir un lieu') + ' · ' + chosenDate + ' à ' + chosenTime;
    }
  });
  modal.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'tab-places' || action === 'tab-time') {
      tab = action === 'tab-places' ? 'places' : 'time'; render(); body.querySelector('[aria-selected="true"]')?.focus(); return;
    }
    if (action === 'next') {
      if (!chosenPlace()) return announce('Choisissez un lieu avant de continuer.', true);
      step = 1; render(); body.querySelector('input[name="moment"]:checked')?.focus(); return;
    }
    if (action === 'back') { step = 0; render(); body.querySelector('input[name="destination"]:checked')?.focus(); return; }
    if (action === 'apply') return project();
    const input = $('placeName');
    const name = (input?.value || '').trim();
    if (action === 'remove') {
      favorites = favorites.filter(item => item.id !== selectedId);
      selectedId = favorites[0]?.id ?? null;
      render(); announce('Lieu fictif supprimé.'); return;
    }
    if (!name) return announce('Saisissez un nom de lieu.', true);
    if (favorites.some(item => item.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr') &&
      (action === 'add' || item.id !== selectedId))) return announce('Ce nom figure déjà dans la liste.', true);
    if (action === 'add') { const id = nextId++; favorites.push({ id, name }); selectedId = id; }
    if (action === 'rename') {
      const place = chosenPlace();
      if (!place) return announce('Choisissez un lieu à renommer.', true);
      place.name = name;
    }
    render(); announce(action === 'add' ? 'Lieu fictif ajouté et sélectionné.' : 'Lieu fictif renommé.');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.open) modal.close();
  });
})();