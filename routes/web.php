<?php

use Inertia\Inertia;
use Illuminate\Support\Facades\Route;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request; // Added explicit import
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\HeldOrderController;
use App\Http\Controllers\Api\TransactionController;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
*/

// --- Public Pages ---
Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

// --- Main App Pages (React Views) ---
Route::middleware(['auth', 'verified'])->group(function () {
    
    // 1. PROTECTED DASHBOARD (Admins Only)
    Route::get('/dashboard', function (Request $request) { 
        // FIX: Check 'is_admin' instead of 'role'
        // If is_admin is false (0), redirect to POS
        if (! $request->user()->is_admin) {
            return redirect()->route('pos');
        }
        return Inertia::render('Dashboard'); 
    })->name('dashboard');

    Route::get('/pos', function () { return Inertia::render('PosTerminal'); })->name('pos');
    Route::get('/inventory', function () { return Inertia::render('Inventory'); })->name('inventory');
    Route::get('/transactions', function () { return Inertia::render('Transactions'); })->name('history');
    Route::get('/settings', function () { return Inertia::render('Settings'); })->name('settings');
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
    Route::get('/api/dashboard', [DashboardController::class, 'index']);

    // Transaction History
    Route::get('/api/transactions', [TransactionController::class, 'index']);
    Route::post('/api/transactions/{id}/void', [TransactionController::class, 'void']);

    // Store Settings
    Route::get('/api/settings', [SettingController::class, 'index']);
    Route::post('/api/settings', [SettingController::class, 'update']);
});

require __DIR__.'/auth.php';