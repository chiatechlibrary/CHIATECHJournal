"""Build the single current Review Engine report from its approved OOXML source."""
import argparse
from pathlib import Path
from build_journal_documents import build_documents

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir', type=Path)
    args = parser.parse_args()
    build_documents(args.output_dir, only={'review'})
