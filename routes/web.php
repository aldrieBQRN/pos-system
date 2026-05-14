<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HeldOrderController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\ShiftController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB; // 👈 1. ADDED THIS FOR DATABASE ACCESS

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// --- Public Pages ---
Route::get('/', function () {
    // Check if user is logged in using the Facade
    if (Auth::check()) {
        return redirect()->route('dashboard');
    }
    // Otherwise, redirect to Login
    return redirect()->route('login');
});

// --- Main App Pages (React Views) ---
Route::middleware(['auth', 'verified'])->group(function () {

    // 1. PROTECTED DASHBOARD (Admins Only)
    Route::get('/dashboard', function (Request $request) {
        if (! $request->user()->is_admin) {
            return redirect()->route('pos');
        }
        return Inertia::render('Dashboard');
    })->name('dashboard');

    // 2. SHIFT HISTORY (Admins Only) - [NEW]
    Route::get('/shifts', function (Request $request) {
        if (! $request->user()->is_admin) {
            return redirect()->route('pos');
        }
        return Inertia::render('ShiftHistory');
    })->name('shifts.index');

    // 👉 2. UPDATED POS ROUTE TO PASS SETTINGS
    Route::get('/pos', function () {
        // Fetch the dynamic settings from the database
        $settings = DB::table('settings')->pluck('value', 'key');

        return Inertia::render('PosTerminal', [
            'store_settings' => $settings // Pass it to your React Component
        ]);
    })->name('pos');

    Route::get('/inventory', function () {
        return Inertia::render('Inventory');
    })->name('inventory');
    Route::get('/transactions', function () {
        return Inertia::render('Transactions');
    })->name('history');
    Route::get('/settings', function () {
        return Inertia::render('Settings');
    })->name('settings');
});

// --- Authenticated Logic (API & Profile) ---
Route::middleware('auth')->group(function () {
    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // ====================================================
    //  API ROUTES
    // ====================================================

    // User Info
    Route::get('/api/user', function (Request $request) {
        return $request->user();
    });

    // Shift Management
    Route::get('/api/shifts', [ShiftController::class, 'index']); // [NEW] History List
    Route::get('/api/shift/check', [ShiftController::class, 'check']);
    Route::post('/api/shift/start', [ShiftController::class, 'start']);
    Route::post('/api/shift/close', [ShiftController::class, 'close']);
    Route::get('/api/pos/shift/data/{id}', [ShiftController::class, 'data']);

    // POS & Checkout
    Route::post('/api/checkout', [PosController::class, 'checkout']);

    // Held Orders
    Route::get('/api/held-orders', [HeldOrderController::class, 'index']);
    Route::post('/api/held-orders', [HeldOrderController::class, 'store']);
    Route::delete('/api/held-orders/{id}', [HeldOrderController::class, 'destroy']);

    // Product Management
    Route::get('/api/products', [ProductController::class, 'index']);
    Route::post('/api/products', [ProductController::class, 'store']);
    Route::put('/api/products/{id}', [ProductController::class, 'update']);
    Route::delete('/api/products/{id}', [ProductController::class, 'destroy']);
    Route::post('/api/products/{id}/stock', [ProductController::class, 'adjustStock']);

    // Category Management
    Route::get('/api/categories', [CategoryController::class, 'index']);
    Route::post('/api/categories', [CategoryController::class, 'store']);
    Route::put('/api/categories/{id}', [CategoryController::class, 'update']);
    Route::delete('/api/categories/{id}', [CategoryController::class, 'destroy']);

    // Dashboard Analytics
    Route::get('/api/dashboard/export', [DashboardController::class, 'export']);
    Route::get('/api/dashboard', [DashboardController::class, 'index']);

    // Transaction History
    Route::get('/api/transactions', [TransactionController::class, 'index']);
    Route::get('/api/transactions/{id}', [TransactionController::class, 'show']);
    Route::post('/api/transactions/{id}/void', [TransactionController::class, 'void']);

    // Store Settings
    Route::get('/api/settings', [SettingController::class, 'index']);
    Route::post('/api/settings', [SettingController::class, 'update']);
});

require __DIR__ . '/auth.php';
