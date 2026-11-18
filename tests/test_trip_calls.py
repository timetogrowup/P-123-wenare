import pathlib, sys, unittest, tempfile, json, gzip
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'scripts'))
from build_trip_calls import course, emit_partitions, sha, encoded

class CompleteCalls(unittest.TestCase):
    def setUp(self):
        self.stops = {s: {'name': s, 'parent': None, 'platform': None} for s in ['A', 'B', 'C']}
        self.trip = {'direction_id': '0', 'trip_headsign': 'C'}
    def test_terminal_dropoff_loop_and_gtfs_hours_are_preserved(self):
        rows = [(1,'A',85800,85800,'0','0','1'), (4,'B',86400,86430,'1','0','0'), (8,'A',87000,87000,'0','0','1'), (10,'C',87600,None,'1','0',None)]
        p,t,c = course(rows, self.trip, ['2026-11-18','2026-11-19'], self.stops)
        self.assertEqual([r[1] for r in p], ['A','B','A','C'])
        self.assertEqual(t[-1][0],87600)
        self.assertEqual(c['terminusStopSequence'],10)
        self.assertTrue(c['availability']['terminalArrivalKnown'])
        self.assertFalse(c['availability']['timesComplete'])
        self.assertEqual(len(c['serviceDates']),2)
    def test_source_anomaly_is_unavailable_not_interpolated(self):
        p,t,c = course([(0,'A',100,100,'0','0','1'),(3,'C',90,90,'1','0','1')], self.trip, ['2026-11-18'], self.stops)
        self.assertEqual(c['availability']['state'],'unavailable')
        self.assertEqual(t[1][0],90)
    def test_invalid_reference_or_sequence_is_rejected(self):
        for rows in [[(0,'A',0,0,'0','0','1'),(0,'C',2,2,'1','0','1')],[(0,'A',0,0,'0','0','1'),(1,'X',2,2,'1','0','1')]]:
            with self.assertRaises(ValueError):course(rows,self.trip,['2026-11-18'],self.stops)
    def test_partition_deduplicates_template_across_dates_and_courses(self):
        p,t,c=course([(0,'A',0,0,'0','0','1'),(2,'C',600,600,'1','0','1')],self.trip,['2026-11-18','2026-11-19'],self.stops)
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d)
            parts=emit_partitions(root/'line',root,'g','L',{'0000000000000000':c,'1000000000000000':c},{c['patternRef']:p},{c['timeTemplateRef']:t},self.stops,{'2026-11-18':0,'2026-11-19':86400000})
            payload=json.loads(gzip.decompress((root/parts['']['file']).read_bytes()))
            self.assertEqual(len(payload['timeTemplates']),1)
            self.assertEqual(len(payload['courses']),2)
            self.assertEqual(len(payload['serviceDays']),2)

if __name__ == '__main__': unittest.main()
