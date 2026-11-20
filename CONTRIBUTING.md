# AGRILEASE Git Workflow

## Mga Branch

- `main` — stable lang. Walang direktang push dito. Pull Request lang ang paraan ng pagbabago.
- `feature/<pangalan>` — branch para sa bagong feature.
- `fix/<pangalan>` — branch para sa pag-aayos ng bug.
- `chore/<pangalan>` — branch para sa maliliit na gawain (docs, cleanup, config).

## Pang-araw-araw na Hakbang

1. Kunin ang pinakabago:
   ```
   git checkout main
   git pull
   ```
2. Gumawa ng branch:
   ```
   git checkout -b feature/pangalan-ng-ginagawa
   ```
3. Pagkatapos ng bawat maliit na gawain, mag-commit at mag-push:
   ```
   git add <mga file>
   git commit -m "feat: maikling paglalarawan"
   git push -u origin feature/pangalan-ng-ginagawa
   ```
4. Sa GitHub, magbukas ng **Pull Request** papuntang `main`, ipasuri sa isang kasama, tapos i-merge.
5. Pagkatapos ng merge:
   ```
   git checkout main
   git pull
   ```
6. Kung may bagong column o table, i-restart ang backend para tumakbo ang `src/ensureSchema.js`.

## Pangalan ng Branch

- `feature/rental-archive`
- `fix/login-error`
- `chore/cleanup`
- `docs/readme-update`

## Commit Message

Gamitin ang format na `uri: paglalarawan`.

| Uri | Gamit |
| --- | --- |
| `feat` | bagong feature |
| `fix` | pag-aayos ng bug |
| `docs` | dokumentasyon lang |
| `test` | pagdagdag o pag-ayos ng test |
| `style` | ayos ng itsura o format, walang pagbabago sa logic |
| `refactor` | pagsasaayos ng code nang walang bagong feature |
| `chore` | iba pang maliliit na gawain |

Halimbawa: `feat: add late fee computation`

## Mga Panuntunan

- Huwag mag-push direkta sa `main`.
- Huwag i-commit ang `.env`, passwords, database credentials, o ang `private_uploads/`.
- Mag-`git pull` sa `main` bago gumawa ng bagong branch.
- Bago mag-push, patakbuhin ang `npm test` sa `backend`.
- Kung may conflict, ayusin ito sa branch mo bago mag-merge.
- Maliit at madalas na commit ang mas mabuti kaysa isang malaking commit.
- Ang mga lumang notes ng bawat phase ay nasa `docs/`. Doon ilagay ang mga bagong notes, hindi sa root.
