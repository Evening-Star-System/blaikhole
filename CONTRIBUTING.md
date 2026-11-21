# Contributing to Blaikhole

Blaikhole is free and open-source software published by Evening Star Productions. The
extension code is AGPL-3.0-or-later; the filter lists are CC-BY-4.0. Contributions are
welcome by pull request, both to the code and to the filter lists (new AI surfaces to hide,
new slop sources to block).

License: AGPL-3.0-or-later (code) and CC-BY-4.0 (lists).

---

## Who Builds This

**Evening Star Productions**

Access to this repository is by invitation. If you are reading this, you were given
that access deliberately. Read this document in full before writing code.

---

## Our Ethos

Every change to this project must align with these principles:

- **In service to Life**: the supreme gate. If a feature, dependency, or design choice
  diminishes life, exploits the vulnerable, manipulates, or concentrates power through
  harm, it does not get added.
- **Built as a permaculture**: prefer the design that makes the other parts of the
  system stronger and improves with time. Durable over disposable, regenerative over
  extractive.
- **Privacy by design**: threat modeling at design time, not retrofitted. No dark
  patterns, no surveillance, no ad model.
- **Encryption of sensitive data at rest**, and least privilege everywhere.
- **Human operable always**: every automated path needs a hand path.
- **Correct and complete over fast**: no overclaiming, in code or in copy.

If a proposed change conflicts with these principles, it does not get merged.

Note what does NOT apply here and does apply to the open-source projects: offline-first,
no-accounts-for-core, FOSS distribution, and copyleft licensing. This is a connected
commercial product and it is online-first by design.

---

## Ownership of Contributions

By committing to this repository you agree:

1. You are the original author of the code or have the right to submit it.
2. All contributions are the property of Evening Star Productions as work made for hire, and you
   assign all right, title, and interest in them to Evening Star Productions.
3. Your contribution contains no third-party code whose license is incompatible with
   AGPL-3.0-or-later (code) or CC-BY-4.0 (filter lists). Permissive (MIT, Apache-2.0, BSD,
   MPL-2.0) and copyleft (GPL, AGPL) dependencies are compatible; public-domain/CC0 and
   CC-BY list data may be incorporated with attribution. Unlicensed third-party lists may
   NOT be bundled, link to them for user subscription instead.

---

## How to Contribute

### Reporting Issues

Open an issue at:
`https://github.com/Evening-Star-System/Blaikhole/issues`

Include steps to reproduce, expected versus actual behavior, and never paste secrets,
tokens, or personal data into an issue.

### Submitting Code

1. Branch from `main`: `feature/your-description` or `fix/your-description`
2. Write clean, readable code that follows the patterns already in the project
3. Run the project's full gate before opening a PR: lint, tests, type check, build
   (see PROJECT.md > Build & Test). No new warnings or errors.
4. Open a pull request with a clear description of what changed and why
5. Consequential and irreversible changes need explicit approval before they land

### What We Do Not Accept

- Secrets, tokens, or credentials committed to the repository, ever
- Telemetry or data collection beyond what the product's privacy posture declares
- Copyleft dependencies without prior written approval
- Client data, personal data, or real member data in fixtures, tests, or screenshots
- Changes that reduce the privacy or security posture of the product

---

## Code Standards

- Follow the existing code style: read the codebase before writing new code
- Version is managed in the project's designated version file (see PROJECT.md Key Files)
- Sensitive data encrypted at rest; secrets come from the vault, never from source
- Tenant isolation is enforced in code, never assumed from a caller
- Write the comment density, naming, and idiom of the surrounding code

---

## Contact

Open an issue at https://github.com/Evening-Star-System, or contact the project lead directly.

---

*In service to Life*
