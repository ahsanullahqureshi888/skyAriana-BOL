import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="w-16 h-16 mx-auto bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-2xl">
          404
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Page Not Found / صفحه یافت نشد
        </h1>
        <p className="text-sm text-slate-500">
          The requested document or page does not exist in Sky Ariana BOL system.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          Return to Dashboard / برگشت به صفحه اصلی
        </Link>
      </div>
    </div>
  )
}
