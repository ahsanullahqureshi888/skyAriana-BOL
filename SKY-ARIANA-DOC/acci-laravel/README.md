# ACCI Invoice Manager

A standalone Laravel 12 module for creating, managing, printing, and downloading ACCI logistics/export invoices. The browser print view and DomPDF view share the same reusable Blade document and dedicated A4 stylesheet, so both outputs retain the same structure.

## Included

- Full CRUD with search and Bootstrap 5 pagination
- MySQL `acci_invoices` migration containing every requested field
- Form Request validation and server-side total recalculation
- Automatic serial numbers beginning at `ACCI-120893`
- English USD amount-in-words conversion
- Transparent stamp and signature uploads on the public disk
- Responsive editor with form on the left and live A4 preview on the right
- A4 portrait print and DomPDF download views with 10 mm margins
- Factory, sample seeder, unit tests, and feature tests

## Requirements

- PHP 8.2 or newer with the common Laravel extensions
- Composer 2
- MySQL 8 or MariaDB 10.6+
- Node.js 20+

## Installation

```powershell
Copy-Item .env.example .env
composer install
php artisan key:generate
```

Create a MySQL database named `acci_invoices`, then set the matching `DB_*` values in `.env`.

```powershell
php artisan migrate --seed
php artisan storage:link
npm install
npm run build
php artisan serve
```

Open the URL printed by `php artisan serve`. The sample seeder creates `ACCI-120892`; the create screen then proposes `ACCI-120893`.

## Development

Run Laravel and Vite in separate terminals:

```powershell
php artisan serve
npm run dev
```

## Verification

```powershell
php artisan test
npm run build
```

The test suite verifies validation, CRUD, search, server-authoritative totals, amount-in-words conversion, stamp storage cleanup, print rendering, and PDF generation.

## Print/PDF design

The canonical invoice markup is in `resources/views/components/acci/document.blade.php`. Print-specific rules are isolated in `resources/css/acci-invoice-print.css` and set an A4 portrait page with 10 mm margins. Keep new document-only styling in that file so browser print and DomPDF remain aligned.

Stamp and signature images are not seeded because they are legal company assets. Upload transparent PNG files from the create or edit screen; the stamp intentionally overlaps the signature region.
