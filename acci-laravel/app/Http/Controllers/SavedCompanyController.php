<?php

namespace App\Http\Controllers;

use App\Models\SavedCompany;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class SavedCompanyController extends Controller
{
    public function index(Request $request): View|JsonResponse
    {
        $type = $request->query('type');
        $query = SavedCompany::query();

        if ($type === 'seller') {
            $query->whereIn('type', ['seller', 'both']);
        } elseif ($type === 'buyer') {
            $query->whereIn('type', ['buyer', 'both']);
        }

        $companies = $query->orderBy('company_name')->get();

        if ($request->wantsJson()) {
            return response()->json($companies);
        }

        return view('saved-companies.index', compact('companies'));
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:seller,buyer,both',
            'company_name' => 'required|string|max:255',
            'address' => 'nullable|string|max:2000',
            'phone' => 'nullable|string|max:100',
            'email' => 'nullable|string|max:255',
            'gst_no' => 'nullable|string|max:100',
            'fssai_no' => 'nullable|string|max:100',
            'iec_code' => 'nullable|string|max:100',
        ]);

        $company = SavedCompany::updateOrCreate(
            ['company_name' => $validated['company_name']],
            $validated
        );

        return response()->json([
            'success' => true,
            'message' => 'Company saved successfully!',
            'company' => $company,
        ]);
    }

    public function destroy(SavedCompany $savedCompany): JsonResponse
    {
        $savedCompany->delete();

        return response()->json([
            'success' => true,
            'message' => 'Saved company deleted.',
        ]);
    }
}
