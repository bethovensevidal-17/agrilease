# AGRILEASE Git Workflow

## Mga Branch

- `main` — stable lang. Walang direktang push dito. Si Bethoven lang ang nagme-merge mula sa `develop`.
- `develop` — dito nagsasama ang lahat ng natapos na feature.
- `feature/<pangalan>` — personal na branch para sa bawat gawain.

## Pang-araw-araw na Hakbang

1. Kunin ang pinakabago:
   ```
   git checkout develop
   git pull
   ```
2. Gumawa ng feature branch:
   ```
   git checkout -b feature/pangalan-ng-ginagawa
   ```
3. Pagkatapos ng trabaho:
   ```
   git add .
   git commit -m "feat: maikling paglalarawan"
   git push -u origin feature/pangalan-ng-ginagawa
   ```
4. Sa GitHub, magbukas ng **Pull Request** papuntang `develop` at ipasuri sa isang kasama bago i-merge.

## Pangalan ng Branch

- `feature/rental-form`
- `feature/late-fee`
- `fix/login-error`
- `docs/readme-update`

## Commit Message

Gamitin ang format na `uri: paglalarawan`.

| Uri | Gamit |
| --- | --- |
| `feat` | bagong feature |
| `fix` | pag-aayos ng bug |
| `docs` | dokumentasyon lang |
| `style` | ayos ng itsura o format, walang pagbabago sa logic |
| `refactor` | pagsasaayos ng code nang walang bagong feature |
| `chore` | iba pang maliliit na gawain |

Halimbawa: `feat: add late fee computation`

## Mga Panuntunan

- Huwag mag-push direkta sa `main` o `develop`.
- Huwag i-commit ang `.env`, passwords, o database credentials.
- Mag-`git pull` sa `develop` bago gumawa ng bagong branch.
- Kung may conflict, ayusin ito sa feature branch mo bago mag-merge.
- Maliit at madalas na commit ang mas mabuti kaysa isang malaking commit.
