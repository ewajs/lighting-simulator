"""Radiance, the research lighting simulator from Lawrence Berkeley National Laboratory.

The checks use Radiance 6.0 patch 2 (release ``rad6R0P2``), pinned by its
checksum. Releases from 2026-02-20 until a fix on 2026-10-15 drop the
multiplier ``ies2rad`` writes, making every IES light 1/area too dark: 55x for
the demo's downlight (ADR 0057). 6.0P2 predates that change.

It is downloaded on first use into ``accuracy/python/.cache``, which git
ignores. Radiance's licence (BSD-style, version 2.0) allows that use; it is
never redistributed. Only macOS on Apple silicon is supported for now: the
binary the checks were verified with.
"""

import hashlib
import os
import platform
import shutil
import subprocess
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path

RELEASE = "rad6R0P2"
"""The pinned release: Radiance 6.0 patch 2, 2026-02-02."""

BUGGY_RELEASE = "39b99660"
"""A release with the ``ies2rad`` multiplier bug (2026-05-05): only for the
test that shows the checks catch it."""

_ASSETS = {
    (RELEASE, "Darwin", "arm64"): (
        "Radiance_c1700d56_OSX_arm64.zip",
        "329ca788c6cedc641ad47577ce985ae16ee291acb1d5d02d7995192d58118cf0",
    ),
    (BUGGY_RELEASE, "Darwin", "arm64"): (
        "Radiance_39b99660_OSX_arm64.zip",
        "00b368c6f1e00bf94b17d52adf2f933fe8f91862a5a0ae77d1e6dd7d31992f5d",
    ),
}
"""The release file and its SHA-256, by release and platform."""

_DOWNLOAD = "https://github.com/LBNL-ETA/Radiance/releases/download/{release}/{asset}"

LUMINOUS_EFFICACY = 179.0
"""lm/W: Radiance's white-light efficacy, turning its radiometric units into lux."""

CACHE = Path(__file__).resolve().parents[2] / ".cache"
"""Where Radiance is installed: accuracy/python/.cache, ignored by git."""


@dataclass(frozen=True)
class Radiance:
    """An installed Radiance: where its programs and library files are."""

    bin_dir: Path
    lib_dir: Path

    def run(
        self,
        program: str,
        *args: str,
        cwd: Path,
        stdin: str = "",
        output: Path | None = None,
    ) -> str:
        """Runs one of Radiance's programs and returns what it prints.

        Args:
            program: e.g. ``oconv`` or ``rtrace``.
            *args: Its command-line arguments.
            cwd: The folder to run in; scene files are found from there.
            stdin: What to feed it.
            output: A file to write its output to, as bytes (an octree is
                binary); it then returns an empty string.

        Returns:
            Its standard output, unless written to ``output``.

        Raises:
            subprocess.CalledProcessError: If it fails, with its error output.
        """
        environment = {
            **os.environ,
            "PATH": f"{self.bin_dir}{os.pathsep}{os.environ.get('PATH', '')}",
            "RAYPATH": f".{os.pathsep}{self.lib_dir}",
        }
        command = [str(self.bin_dir / program), *args]
        if output is not None:
            with output.open("wb") as file:
                subprocess.run(
                    command,
                    input=stdin.encode(),
                    stdout=file,
                    stderr=subprocess.PIPE,
                    cwd=cwd,
                    env=environment,
                    check=True,
                )
            return ""
        result = subprocess.run(
            command,
            input=stdin,
            capture_output=True,
            text=True,
            cwd=cwd,
            env=environment,
            check=True,
        )
        return result.stdout


def machine() -> str:
    """The processor's name, e.g. "Apple M1 Pro", to say where timings were taken.

    Returns:
        The name macOS gives, or Python's generic one elsewhere.
    """
    if platform.system() == "Darwin":
        result = subprocess.run(
            ["sysctl", "-n", "machdep.cpu.brand_string"],
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    return platform.processor() or platform.machine()


def supported(release: str = RELEASE) -> bool:
    """Whether a release is pinned for this platform, so it can be installed here.

    Args:
        release: The release.

    Returns:
        True on a platform with a pinned build of it.
    """
    return (release, platform.system(), platform.machine()) in _ASSETS


def install(release: str = RELEASE, cache: Path = CACHE) -> Radiance:
    """Returns a pinned Radiance, downloading and checking it on first use.

    Args:
        release: Which release; RELEASE unless a test needs another.
        cache: Where to keep it.

    Returns:
        The installed Radiance.

    Raises:
        RuntimeError: On an unsupported platform, or if the download's
            checksum doesn't match.
    """
    key = (release, platform.system(), platform.machine())
    if key not in _ASSETS:
        raise RuntimeError(f"No pinned Radiance {release} for {key[1]} on {key[2]}")
    asset, sha256 = _ASSETS[key]
    home = cache / release
    installed = Radiance(home / "radiance" / "bin", home / "radiance" / "lib")
    if (installed.bin_dir / "rtrace").exists():
        return installed

    home.mkdir(parents=True, exist_ok=True)
    archive = home / asset
    url = _DOWNLOAD.format(release=release, asset=asset)
    with urllib.request.urlopen(url) as response, archive.open("wb") as file:
        shutil.copyfileobj(response, file)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    if digest != sha256:
        archive.unlink()
        raise RuntimeError(f"{asset}: checksum {digest} doesn't match the pinned {sha256}")
    with zipfile.ZipFile(archive) as zipped:
        for member in zipped.infolist():
            target = Path(zipped.extract(member, home))
            # zipfile drops Unix permissions; the archive keeps them in external_attr.
            mode = member.external_attr >> 16
            if mode:
                target.chmod(mode & 0o777)
    archive.unlink()
    return installed
