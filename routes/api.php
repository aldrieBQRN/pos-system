<?php

use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PosController;
use Illuminate\Support\Facades\Route;

// Public route to fetch products
Route::get('/products', [ProductController::class, 'index']);
Route::post('/checkout', [PosController::class, 'checkout']);
Route::post('/products', [App\Http\Controllers\Api\ProductController::class, 'store']);
Route::delete('/products/{id}', [App\Http\Controllers\Api\ProductController::class, 'destroy']);
Route::put('/products/{id}', [App\Http\Controllers\Api\ProductController::class, 'update']);
Route::get('/dashboard', [App\Http\Controllers\Api\DashboardController::class, 'index']);
Route::get('/transactions', [App\Http\Controllers\Api\TransactionController::class, 'index']);
Route::get('/settings', [App\Http\Controllers\Api\SettingController::class, 'index']);
Route::post('/settings', [App\Http\Controllers\Api\SettingController::class, 'update']);
