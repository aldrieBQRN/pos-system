<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

// Public / POS Routes (Accessible by any logged-in user)
Route::middleware('auth')->group(function () {
    Route::get('/', function () {
        $user = Auth::user();
        
        // Redirect logic: Admins go to Dashboard, Cashiers go to POS
        return $user->is_admin 
            ? redirect()->route('dashboard') 
            : redirect()->route('pos');
    });

    Route::get('/pos', function () {
        return Inertia::render('PosTerminal');
    })->name('pos');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// ADMIN ONLY Routes (Dashboard, Inventory, History, Settings)
Route::middleware(['auth', 'verified', 'admin'])->group(function () {
    
    Route::get('/dashboard', function () {
        return Inertia::render('Dashboard');
    })->name('dashboard');

    Route::get('/inventory', function () {
        return Inertia::render('Inventory');
    })->name('inventory');

    Route::get('/transactions', function () {
        return Inertia::render('Transactions');
    })->name('transactions');

    // NEW: Settings Page
    Route::get('/settings', function () {
        return Inertia::render('Settings');
    })->name('settings');
});

require __DIR__.'/auth.php';