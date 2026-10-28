import importlib.util
import io
import tarfile
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('extract_release', Path(__file__).with_name('extract-release.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ExtractTests(unittest.TestCase):
    def check(self, entries, accepted):
        with tempfile.TemporaryDirectory() as tmp:
            archive = Path(tmp) / 'release.tar.gz'
            dest = Path(tmp) / 'out'
            dest.mkdir()
            with tarfile.open(archive, 'w:gz') as tar:
                for name, kind, link in entries:
                    item = tarfile.TarInfo(name)
                    item.type = kind
                    item.linkname = link
                    tar.addfile(item, io.BytesIO(b'') if item.isfile() else None)
            if accepted:
                module.extract_checked(archive, dest)
            else:
                with self.assertRaises((ValueError, tarfile.TarError)):
                    module.extract_checked(archive, dest)

    def test_paths_and_links(self):
        self.check([('app/file', tarfile.REGTYPE, ''), ('app/link', tarfile.SYMTYPE, 'file')], True)
        self.check([('../escape', tarfile.REGTYPE, '')], False)
        self.check([('app/link', tarfile.SYMTYPE, '../../escape')], False)
        self.check([('app/link', tarfile.SYMTYPE, 'file'), ('app/link/file', tarfile.REGTYPE, '')], False)
        self.check([('same', tarfile.REGTYPE, ''), ('same', tarfile.REGTYPE, '')], False)
        self.check([('device', tarfile.CHRTYPE, '')], False)


if __name__ == '__main__':
    unittest.main()
