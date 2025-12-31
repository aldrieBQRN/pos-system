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
            'store_logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048', // Validate Image
        ]);

        // 1. Handle File Upload
        if ($request->hasFile('store_logo')) {
            $file = $request->file('store_logo');
            
            // Save as 'logo.png' in the public folder (Overwrites existing)
            // This ensures your AuthenticatedLayout <img src="/logo.png"> works instantly.
            $file->move(public_path(), 'logo.png');

            // Optional: Save the path in DB (though we hardcode it in layout currently)
            DB::table('settings')->updateOrInsert(
                ['key' => 'store_logo'],
                ['value' => '/logo.png', 'updated_at' => now()]
            );
        }

        // 2. Save Text Fields
        $fieldsToSave = ['store_name', 'store_address', 'store_phone'];
        foreach ($fieldsToSave as $key) {
            if ($request->has($key)) {
                DB::table('settings')->updateOrInsert(
                    ['key' => $key],
                    ['value' => $request->input($key), 'updated_at' => now()]
                );
            }
        }

        return response()->json(['success' => true, 'message' => 'Settings updated!']);
    }
}