// 'use client';

// import Image from 'next/image';
// import { useAuth } from 'react-oidc-context';
// import LoginButtons from '@components/LoginButtons';

// export default function HomePage() {
//   const auth = useAuth();

//   if (auth.isLoading) return <p className="text-center mt-8 text-gray-600">Loading...</p>;

//   if (!auth.isAuthenticated) {
//     return (
//       <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
//         <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-xl text-center">
//           <div className="flex items-center justify-center mb-4">
//             <Image src="/innodia_cristal.png" alt="INNODIA Logo" width={60} height={60} className="mr-2" />
//             <h1 className="text-2xl font-bold text-inodia-blue">Early Navigator Center App</h1>
//           </div>
//           <p className="text-gray-600 mb-6">Please sign in to continue.</p>
//           <LoginButtons />
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4">
//       <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-xl text-center">
//         <div className="flex items-center justify-center mb-4">
//           <Image src="/innodia_logo.png" alt="INNODIA Logo" width={60} height={60} className="mr-2" />
//           <h1 className="text-2xl font-bold text-inodia-blue">Welcome back!</h1>
//         </div>
//         <p className="text-gray-600 mb-2">Name: <strong>{auth.user?.profile.name || 'User'}</strong></p>
//         <p className="text-gray-600 mb-4">Email: <strong>{auth.user?.profile.email}</strong></p>
//         <LoginButtons />
//       </div>
//     </div>
//   );
// }

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}