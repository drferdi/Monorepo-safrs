# Architected and built by codieverse+.
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent


def read_ico_sizes(path: Path) -> list[tuple[int, int]]:
    data = path.read_bytes()
    reserved, image_type, count = struct.unpack_from("<HHH", data, 0)
    if reserved != 0 or image_type != 1:
        raise AssertionError("Invalid ICO header")

    sizes: list[tuple[int, int]] = []
    offset = 6
    for _ in range(count):
        width, height = struct.unpack_from("<BB", data, offset)
        sizes.append((256 if width == 0 else width, 256 if height == 0 else height))
        offset += 16
    return sizes


def read_png_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise AssertionError("Invalid PNG signature")
    width, height = struct.unpack_from(">II", data, 16)
    return width, height


class IconAssetTests(unittest.TestCase):
    def test_public_icons_have_expected_sizes(self):
        icons_dir = ROOT / "public" / "icons"
        expected = [16, 24, 32, 48, 64, 128, 256, 512]

        for size in expected:
            path = icons_dir / f"sidelab-{size}.png"
            self.assertTrue(path.exists(), f"Missing icon asset: {path}")
            self.assertEqual(read_png_size(path), (size, size))

    def test_desktop_icon_source_and_layers_have_expected_sizes(self):
        icons_dir = ROOT / "public" / "icons"

        self.assertEqual(read_png_size(icons_dir / "sidelab-desktop.png"), (512, 512))
        for size in [16, 24, 32, 48, 64, 128, 256, 512]:
            self.assertEqual(
                read_png_size(icons_dir / f"sidelab-desktop-{size}.png"), (size, size)
            )

    def test_installer_ico_contains_expected_windows_layers(self):
        path = ROOT / "installer" / "assets" / "sidelab.ico"
        self.assertTrue(path.exists(), "installer/assets/sidelab.ico should exist")
        self.assertEqual(
            read_ico_sizes(path),
            [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
        )


if __name__ == "__main__":
    unittest.main()
