<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| These routes are typically stateless (using Tokens). Since we moved 
| our logic to web.php to use Session Cookies, we can leave this blank 
| or keep the default user route for external apps.
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});