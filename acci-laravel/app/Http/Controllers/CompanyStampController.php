<?php

namespace App\Http\Controllers;

use App\Models\CompanyStamp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompanyStampController extends Controller
{
    public function index()
    {
        $stamps = CompanyStamp::orderBy('company_name')->get();
        return view('company-stamps.index', compact('stamps'));
    }

    public function create()
    {
        return view('company-stamps.create');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255|unique:company_stamps',
            'stamp_image' => 'required|image|mimes:png|max:2048',
        ]);

        $file = $request->file('stamp_image');
        $filename = uniqid() . '.' . $file->getClientOriginalExtension();
        $file->move(public_path('images/stamps'), $filename);
        $path = 'images/stamps/' . $filename;

        CompanyStamp::create([
            'company_name' => strtoupper($validated['company_name']),
            'stamp_image_path' => $path,
        ]);

        return redirect()->route('company-stamps.index')->with('success', 'Company stamp added successfully.');
    }

    public function edit(CompanyStamp $company_stamp)
    {
        return view('company-stamps.edit', compact('company_stamp'));
    }

    public function update(Request $request, CompanyStamp $company_stamp)
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255|unique:company_stamps,company_name,' . $company_stamp->id,
            'stamp_image' => 'nullable|image|mimes:png|max:2048',
        ]);

        $company_stamp->company_name = strtoupper($validated['company_name']);

        if ($request->hasFile('stamp_image')) {
            if ($company_stamp->stamp_image_path && file_exists(public_path($company_stamp->stamp_image_path))) {
                unlink(public_path($company_stamp->stamp_image_path));
            }
            $file = $request->file('stamp_image');
            $filename = uniqid() . '.' . $file->getClientOriginalExtension();
            $file->move(public_path('images/stamps'), $filename);
            $company_stamp->stamp_image_path = 'images/stamps/' . $filename;
        }

        $company_stamp->save();

        return redirect()->route('company-stamps.index')->with('success', 'Company stamp updated successfully.');
    }

    public function destroy(CompanyStamp $company_stamp)
    {
        if ($company_stamp->stamp_image_path && file_exists(public_path($company_stamp->stamp_image_path))) {
            unlink(public_path($company_stamp->stamp_image_path));
        }
        $company_stamp->delete();

        return redirect()->route('company-stamps.index')->with('success', 'Company stamp deleted successfully.');
    }
}
