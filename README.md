[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://github.com/drishit96/budgetsco/blob/main/LICENSE.md) [![E2E Tests](https://github.com/drishit96/budgetsco/actions/workflows/playwright.yml/badge.svg)](https://github.com/drishit96/budgetsco/actions/workflows/playwright.yml)

# Budgetsco

A fast, simple and reliable expense manager.

[<img src="https://user-images.githubusercontent.com/13049630/167261179-740abe4c-30a5-40e1-9dbd-2e5e501e5a32.png" width="150" />](https://play.google.com/store/apps/details?id=com.app.budgetsco)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Installing

1. Run `npm install` to install the packages
2. Replace all variables with actual values in [ui.config.ts](https://github.com/drishit96/budgetsco/blob/main/app/lib/ui.config.ts). These are public variables used in the UI.
3. Create a new file '.env' and set the environment variables as per [env.sample](https://github.com/drishit96/budgetsco/blob/main/env.sample) file
4. Run `npm run dev` to start the dev server
5. Open `http://localhost:3000` on your browser

## Built With

- [Remix](https://remix.run/) - Web framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Typescript](https://www.typescriptlang.org/) - Language
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
- [Firebase](https://firebase.google.com/docs/) - Authentication and push notifications
- [Google Play Billing](https://developer.android.com/google/play/billing/integrate) - For subscription on android app
- [Stripe](https://stripe.com/) - For subscription when Google Play Billing is not supported
- [NewRelic](https://newrelic.com/) - Error logging

## Contributing

Please read [CONTRIBUTING.md](https://github.com/drishit96/budgetsco/blob/main/CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests to us.

## Author

- **Drishit Mitra** - [drishit96](https://github.com/drishit96)

See also the list of [contributors](https://github.com/drishit96/budgetsco/graphs/contributors) who participated in this project.

## License

This project is licensed under the GNU General Public License v3.0 license - see the [LICENSE.md](https://github.com/drishit96/budgetsco/blob/main/LICENSE.md) file for details
