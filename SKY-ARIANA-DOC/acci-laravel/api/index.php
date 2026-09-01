<?php

define('LARAVEL_START', microtime(true));

try {
    if (!getenv('APP_KEY') && !isset($_ENV['APP_KEY'])) {
        $key = 'base64:3S+3kFpG0l8s9+xJ+xJ3J1Z8A9K0vQ1w2e3r4t5y6u7=';
        putenv("APP_KEY={$key}");
        $_ENV['APP_KEY'] = $key;
        $_SERVER['APP_KEY'] = $key;
    }
    if (!getenv('APP_ENV')) {
        putenv('APP_ENV=production');
        $_ENV['APP_ENV'] = 'production';
        $_SERVER['APP_ENV'] = 'production';
    }

    $appUrl = 'https://acci-laravel.vercel.app';
    putenv("APP_URL={$appUrl}");
    $_ENV['APP_URL'] = $appUrl;
    $_SERVER['APP_URL'] = $appUrl;

    putenv("ASSET_URL={$appUrl}");
    $_ENV['ASSET_URL'] = $appUrl;
    $_SERVER['ASSET_URL'] = $appUrl;

    putenv('LOG_CHANNEL=stderr');
    $_ENV['LOG_CHANNEL'] = 'stderr';
    $_SERVER['LOG_CHANNEL'] = 'stderr';

    putenv('SESSION_DRIVER=cookie');
    $_ENV['SESSION_DRIVER'] = 'cookie';
    $_SERVER['SESSION_DRIVER'] = 'cookie';

    putenv('SESSION_SAME_SITE=none');
    $_ENV['SESSION_SAME_SITE'] = 'none';
    $_SERVER['SESSION_SAME_SITE'] = 'none';

    putenv('SESSION_SECURE_COOKIE=true');
    $_ENV['SESSION_SECURE_COOKIE'] = 'true';
    $_SERVER['SESSION_SECURE_COOKIE'] = 'true';

    $_SERVER['HTTPS'] = 'on';
    $_SERVER['HTTP_X_FORWARDED_PROTO'] = 'https';
    $_SERVER['HTTP_X_FORWARDED_PORT'] = '443';
    $_SERVER['SERVER_PORT'] = '443';

    $tmpStorage = '/tmp/storage';
    if (!file_exists($tmpStorage)) {
        @mkdir($tmpStorage . '/framework/views', 0755, true);
        @mkdir($tmpStorage . '/framework/cache', 0755, true);
        @mkdir($tmpStorage . '/framework/sessions', 0755, true);
        @mkdir($tmpStorage . '/logs', 0755, true);
    }
    putenv("VIEW_COMPILED_PATH={$tmpStorage}/framework/views");
    $_ENV['VIEW_COMPILED_PATH'] = "{$tmpStorage}/framework/views";
    $_SERVER['VIEW_COMPILED_PATH'] = "{$tmpStorage}/framework/views";

    $tmpBootstrapCache = '/tmp/bootstrap/cache';
    if (!file_exists($tmpBootstrapCache)) {
        @mkdir($tmpBootstrapCache, 0755, true);
    }
    putenv("APP_SERVICES_CACHE={$tmpBootstrapCache}/services.php");
    $_ENV['APP_SERVICES_CACHE'] = "{$tmpBootstrapCache}/services.php";
    $_SERVER['APP_SERVICES_CACHE'] = "{$tmpBootstrapCache}/services.php";

    putenv("APP_PACKAGES_CACHE={$tmpBootstrapCache}/packages.php");
    $_ENV['APP_PACKAGES_CACHE'] = "{$tmpBootstrapCache}/packages.php";
    $_SERVER['APP_PACKAGES_CACHE'] = "{$tmpBootstrapCache}/packages.php";

    putenv("APP_ROUTES_CACHE={$tmpBootstrapCache}/routes-v7.php");
    $_ENV['APP_ROUTES_CACHE'] = "{$tmpBootstrapCache}/routes-v7.php";
    $_SERVER['APP_ROUTES_CACHE'] = "{$tmpBootstrapCache}/routes-v7.php";

    putenv("APP_EVENTS_CACHE={$tmpBootstrapCache}/events.php");
    $_ENV['APP_EVENTS_CACHE'] = "{$tmpBootstrapCache}/events.php";
    $_SERVER['APP_EVENTS_CACHE'] = "{$tmpBootstrapCache}/events.php";

    $tmpDb = '/tmp/database.sqlite';
    if (!file_exists($tmpDb) || filesize($tmpDb) < 1000) {
        $origDb = __DIR__ . '/../database/database.sqlite';
        if (file_exists($origDb)) {
            @copy($origDb, $tmpDb);
        } else {
            @touch($tmpDb);
        }
    }

    try {
        if (file_exists($tmpDb) && filesize($tmpDb) > 0) {
            $pdo = new \PDO("sqlite:{$tmpDb}");
            $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_SILENT);
            $pdo->exec("PRAGMA journal_mode = WAL;");
            $pdo->exec("PRAGMA synchronous = NORMAL;");
            $pdo->exec("PRAGMA busy_timeout = 10000;");
            $pdo->exec("PRAGMA cache_size = -64000;");
            $pdo->exec("PRAGMA temp_store = MEMORY;");

            // Verify shipping_stickers columns
            $cols = $pdo->query("PRAGMA table_info(shipping_stickers)")->fetchAll(\PDO::FETCH_ASSOC);
            $colNames = array_map(fn($c) => $c['name'] ?? '', $cols ?: []);

            if (!in_array('lot_no', $colNames)) {
                $pdo->exec("ALTER TABLE shipping_stickers ADD COLUMN lot_no TEXT NULL");
            }
            if (!in_array('transport_mode', $colNames)) {
                $pdo->exec("ALTER TABLE shipping_stickers ADD COLUMN transport_mode TEXT NULL");
            }

            // Verify acci_invoices columns
            $invCols = $pdo->query("PRAGMA table_info(acci_invoices)")->fetchAll(\PDO::FETCH_ASSOC);
            $invColNames = array_map(fn($c) => $c['name'] ?? '', $invCols ?: []);
            if (!in_array('acci_no', $invColNames)) {
                $pdo->exec("ALTER TABLE acci_invoices ADD COLUMN acci_no TEXT NULL");
            }

            // Indexes for lightning-fast queries
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_stk_no ON shipping_stickers (sticker_no);");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_inv_no ON acci_invoices (invoice_no);");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_pl_no ON acci_packing_lists (packing_list_no);");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_awb_no ON air_waybills (awb_number);");
            $pdo->exec("CREATE INDEX IF NOT EXISTS idx_safta_ref ON safta_certificates (reference_no);");

            // Verify saved_companies table
            $hasSavedCompanies = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='saved_companies'")->fetchAll();
            if (empty($hasSavedCompanies)) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS saved_companies (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    type TEXT DEFAULT 'both',
                    company_name TEXT NOT NULL,
                    address TEXT NULL,
                    phone TEXT NULL,
                    email TEXT NULL,
                    gst_no TEXT NULL,
                    fssai_no TEXT NULL,
                    iec_code TEXT NULL,
                    created_at DATETIME,
                    updated_at DATETIME
                )");
            }

            // Verify company_stamps table
            $hasCompanyStamps = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='company_stamps'")->fetchAll();
            if (empty($hasCompanyStamps)) {
                $pdo->exec("CREATE TABLE IF NOT EXISTS company_stamps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_name TEXT NOT NULL,
                    stamp_image_path TEXT NOT NULL,
                    created_at DATETIME,
                    updated_at DATETIME
                )");
            }
        }
    } catch (\Throwable $e) {
        // Ignore DB check error
    }
    putenv('DB_CONNECTION=sqlite');
    $_ENV['DB_CONNECTION'] = 'sqlite';
    $_SERVER['DB_CONNECTION'] = 'sqlite';
    putenv("DB_DATABASE={$tmpDb}");
    $_ENV['DB_DATABASE'] = $tmpDb;
    $_SERVER['DB_DATABASE'] = $tmpDb;

    require __DIR__.'/../vendor/autoload.php';

    /** @var \Illuminate\Foundation\Application $app */
    $app = require_once __DIR__.'/../bootstrap/app.php';

    $app->handleRequest(\Illuminate\Http\Request::capture());
} catch (\Throwable $e) {
    header('Content-Type: application/json', true, 500);
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
    ]);
}
