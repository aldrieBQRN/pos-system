<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PosController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\SettingController;
use App\Models\Category;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// 1. POS & Checkout
Route::post('/checkout', [PosController::class, 'checkout']);

// 2. Product Management (Inventory)
Route::get('/products', [ProductController::class, 'index']);
Route::post('/products', [ProductController::class, 'store']);
Route::put('/products/{id}', [ProductController::class, 'update']);
Route::delete('/products/{id}', [ProductController::class, 'destroy']);

// 3. Category Helper (For Dropdowns)
Route::get('/categories', function () {
    return Category::orderBy('name')->get(); // Added 'orderBy' so list is A-Z
});

// 4. Dashboard Analytics
Route::get('/dashboard', [DashboardController::class, 'index']);

// 5. Transaction History
Route::get('/transactions', [TransactionController::class, 'index']);

// 6. Store Settings
Route::get('/settings', [SettingController::class, 'index']);
Route::post('/settings', [SettingController::class, 'update']);