// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import Link from 'next/link';

// // Universal styles
// const styles = {
//   outfitFont: { fontFamily: 'Outfit, sans-serif' }
// };

// export default function DashboardPage() {
//   const [user, setUser] = useState(null);
//   const router = useRouter();

//   useEffect(() => {
//     // Check if user is logged in
//     const userData = localStorage.getItem('user');
//     if (!userData) {
//       router.push('/login');
//       return;
//     }
//     setUser(JSON.parse(userData));
//   }, [router]);

//   const handleLogout = () => {
//     localStorage.removeItem('user');
//     router.push('/');
//   };

//   if (!user) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50">
//       {/* Header */}
//       <header className="bg-[#017ACB] shadow-sm">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
//           <div className="flex justify-between items-center h-16">
//             <div className="flex items-center">
//               <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-12 w-auto" />
//               <div className="flex flex-col ml-3">
//                 <h1 className="text-2xl font-bold text-white leading-tight" style={styles.outfitFont}>
//                   Capstone Dynamics
//                 </h1>
//               </div>
//             </div>
//             <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
//               <h1 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
//                 Resource & Capacity
//               </h1>
//               <h2 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
//                 Management Planner
//               </h2>
//             </div>
//             <div className="flex items-center gap-4">
//               <span className="text-white font-semibold" style={styles.outfitFont}>{user.firstName} {user.lastName}</span>
//               <button
//                 onClick={handleLogout}
//                 className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden hover:opacity-90 transition cursor-pointer"
//                 title="Logout"
//               >
//                 {user.profileImage ? (
//                   <img 
//                     src={user.profileImage} 
//                     alt="Profile" 
//                     className="w-full h-full object-cover"
//                   />
//                 ) : (
//                   <span className="text-[#017ACB] font-bold text-lg">
//                     {user.firstName.charAt(0)}{user.lastName.charAt(0)}
//                   </span>
//                 )}
//               </button>
//             </div>
//           </div>
//         </div>
//       </header>

//       {/* Main Content */}
//       <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//         {/* Welcome Message */}
//         <h2 className="text-2xl text-gray-900 mb-6" style={styles.outfitFont}>Welcome back, {user.firstName} {user.lastName}</h2>

//         {/* filter switch */}
//         <div>
//           <button className="p-1 w-15 border border-gray-300 text-center cursor-pointer text-gray-600" style={styles.outfitFont}>All</button>
//           <button className="p-1 w-15 border border-gray-300 text-center cursor-pointer text-gray-600" style={styles.outfitFont}>Mine</button>
//         </div>

//         {/* count board */}
//         <div className="grid grid-cols-4 gap-6 mb-6">
//           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
//             <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Active Initiatives</p>
//             <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>✅ 2</h3>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
//             <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Planned Initiatives</p>
//             <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>📝 0</h3>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
//             <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Initiatives on Hold</p>
//             <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>⏸️ 0</h3>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
//             <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Initiatives in Back Log</p>
//             <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>📆 1</h3>
//           </div>
//         </div>

//         {/* navigation */}
//         <div className="grid grid-cols-3 gap-6">
//           <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
//             <div className="text-4xl mb-2 text-gray-700">place icon</div> {/* Replace with icon */}
//             <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Capacity Summary</h3>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
//             <div className="text-4xl mb-2 text-gray-700">place icon</div> {/* Replace with icon */}
//             <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Resources</h3>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
//             <div className="text-4xl mb-2 text-gray-700">place icon</div> {/* Replace with icon */}
//             <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Initiatives</h3>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
//             <div className="text-4xl mb-2 text-gray-700">place icon</div> {/* Replace with icon */}
//             <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Assignments</h3>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
//             <div className="text-4xl mb-2 text-gray-700">place icon</div> {/* Replace with icon */}
//             <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Calendar</h3>
//           </div>

//           <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
//             <div className="text-4xl mb-2 text-gray-700">place icon</div> {/* Replace with icon */}
//             <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Report</h3>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Universal styles
const styles = {
  outfitFont: { fontFamily: 'Outfit, sans-serif' }
};

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userData));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#017ACB] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src="/CapstoneDynamicsLogo.png" alt="Logo" className="h-12 w-auto" />
              <div className="flex flex-col ml-3">
                <h1 className="text-2xl font-bold text-white leading-tight" style={styles.outfitFont}>
                  Capstone Dynamics
                </h1>
              </div>
            </div>

            <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
              <h1 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
                Resource & Capacity
              </h1>
              <h2 className="text-xl font-bold text-white leading-tight" style={styles.outfitFont}>
                Management Planner
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-white font-semibold" style={styles.outfitFont}>
                {user?.username || ''}
              </span>

              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center overflow-hidden hover:opacity-90 transition cursor-pointer"
                title="Logout"
              >
                <span className="text-[#017ACB] font-bold text-lg">
                  {user?.username?.charAt(0)?.toUpperCase() || ''}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <h2 className="text-2xl text-gray-900 mb-6" style={styles.outfitFont}>
          Welcome back, {user?.username || ''}
        </h2>

        {/* filter switch */}
        <div>
          <button className="p-1 w-15 border border-gray-300 text-center cursor-pointer text-gray-600" style={styles.outfitFont}>All</button>
          <button className="p-1 w-15 border border-gray-300 text-center cursor-pointer text-gray-600" style={styles.outfitFont}>Mine</button>
        </div>

        {/* count board */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Active Initiatives</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>✅ 2</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Planned Initiatives</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>📝 0</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Initiatives on Hold</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>⏸️ 0</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition">
            <p className="text-gray-600 text-sm text-right" style={styles.outfitFont}>Initiatives in Back Log</p>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>📆 1</h3>
          </div>
        </div>

        {/* navigation */}
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Capacity Summary</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Resources</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Initiatives</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Assignments</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Calendar</h3>
          </div>

          <div className="bg-white rounded-lg shadow-sm border text-center border-gray-200 p-6 hover:shadow-md hover:border-gray-500 cursor-pointer transition">
            <div className="text-4xl mb-2 text-gray-700">place icon</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2" style={styles.outfitFont}>Report</h3>
          </div>
        </div>
      </main>
    </div>
  );
}
