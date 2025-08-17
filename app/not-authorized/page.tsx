// app/not-authorized/page.tsx
export default function NotAuthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">🚫 Access Denied</h1>
        <p className="text-gray-700">You do not have permission to access this page.</p>
      </div>
    </div>
  );
}