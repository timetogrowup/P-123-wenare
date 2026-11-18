"""Sample one complete published course per mode, verifying its immutable file chain."""
import argparse,gzip,hashlib,json,pathlib,time,urllib.request

def check(base, expected):
    def get(entry, limit=1048576):
        file=entry['file']
        if not file.startswith('trip-calls/') or '..' in file.split('/'):
            raise ValueError('Unsafe descriptor')
        with urllib.request.urlopen(urllib.request.Request(base+file,headers={'Cache-Control':'no-cache'}),timeout=30) as response:
            raw=response.read(limit+1)
        if len(raw)>limit or len(raw)!=entry['bytes'] or hashlib.sha256(raw).hexdigest()!=entry['sha256']:
            raise ValueError('Published file does not match qualified descriptor: '+file)
        if entry.get('encoding')=='gzip-json':
            raw=gzip.decompress(raw)
            if len(raw)!=entry['decodedBytes'] or len(raw)>limit:raise ValueError('Invalid decoded size')
        return json.loads(raw)
    regional=json.loads((expected/'mobility/manifest.json').read_bytes())
    m=get(regional['tripCallsManifest'])
    if m['generationId']!=regional['generationId']:raise ValueError('Wrong deployed generation')
    samples={}
    for line,entry in m['lines'].items():
        mode='metro' if entry['transportKind']=='metro' else regional['scope'][line.removeprefix('IDFM:')]
        if mode in samples:continue
        index=get(entry,128*1024)
        part=get(next(iter(index['partitions'].values())))
        if part['generationId']!=m['generationId'] or part['lineId']!=line:raise ValueError('Published identity mismatch')
        trip=next(iter(part['courses'].values()));pattern=part['patterns'][trip['patternRef']];times=part['timeTemplates'][trip['timeTemplateRef']]
        if pattern[-1][1]!=trip['terminusStopId'] or times[-1][0] is None:raise ValueError('Sample terminal missing')
        samples[mode]={'line':line,'calls':len(pattern),'terminalArrivalVerified':True}
    if set(samples)!=set(m['qa']['modes']):raise ValueError('Missing mode sample')
    print('TRIP_CALLS_HTTPS_OK',json.dumps({'generation':m['generationId'],'sampledModes':samples,'exhaustive':False}),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--base',default='https://timetogrowup.github.io/P-123-wenare/distribution/');p.add_argument('--expected-root',type=pathlib.Path,default=pathlib.Path('distribution'));p.add_argument('--attempts',type=int,default=8);p.add_argument('--delay',type=int,default=10);a=p.parse_args()
    for attempt in range(a.attempts):
        try:check(a.base,a.expected_root);break
        except Exception as error:
            print('TRIP_CALLS_HTTPS_RETRY',attempt+1,str(error),flush=True)
            if attempt+1==a.attempts:raise
            time.sleep(a.delay)
