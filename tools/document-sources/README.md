# Current document sources

These are the OOXML parts of the six supplied SETEHEM resources, captured on 28 August 2026. The former generators recreated obsolete content, names and email addresses and are retained only in the local recovery snapshot.

Each named JSON map associates a DOCX member with a deduplicated XML or media part. The builders package these parts without redesigning or abridging the documents. They do not create authors/ mirrors or duplicate Review Engine downloads. `tools/document-contract.json` defines names and validation expectations.

Run both builders with `--output-dir tools/qa-output/rebuild-YYYYMMDD` in a fresh directory for that run. Run the validator with the same `--downloads` path, render and review every page, then replace the release downloads while Word is closed. Older tools/docx-staging output can contain obsolete files; do not copy it wholesale. ZIP timestamps may differ; validation compares every decompressed member with its approved source.

For future approved Word edits, retain a backup and update the corresponding map/parts from the edited DOCX. Content-addressed parts are immutable: changed parts receive a new SHA-256 filename. Recheck all documents sharing a part. Never put unpublished papers here.
