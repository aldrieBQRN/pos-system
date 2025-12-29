<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    // GET: /api/settings
    public function index()
    {
        // Return as a simple object: { store_name: "...", store_address: "..." }
        $settings = DB::table('settings')->pluck('value', 'key');
        return response()->json($settings);
    }

    // POST: /api/settings
    public function update(Request $request)
    {
        $validated = $request->validate([
            'store_name' => 'required|string|max:100',
            'store_address' => 'required|string|max:255',
            'store_phone' => 'nullable|string|max:50',
        ]);

        foreach ($validated as $key => $value) {
            DB::table('settings')->updateOrInsert(
                ['key' => $key],
                ['value' => $value, 'updated_at' => now()]
            );
        }

        return response()->json(['success' => true, 'message' => 'Settings updated!']);
    }
}