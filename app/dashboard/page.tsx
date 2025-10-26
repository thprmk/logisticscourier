// app/dashboard/page.tsx

"use client";

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Define a type for a User object (without the password)
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export default function TenantDashboard() {
  const router = useRouter();

  // State for the list of users in this branch
  const [users, setUsers] = useState<User[]>([]);
  
  // State for the "Add New Staff" form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff'); // Default role for new users

  // State for loading and error messages
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  // Function to fetch users for this tenant
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users. You may not have permission.');
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users when the component first loads
  useEffect(() => {
    fetchUsers();
  }, []);

  // Function to handle creating a new staff member
  const handleAddUser = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add user');
      }
      // Success! Reset the form and refresh the user list
      setName('');
      setEmail('');
      setPassword('');
      setRole('staff');
      fetchUsers(); // Re-fetch to show the new user
    } catch (err: any) {
      setFormError(err.message);
    }
  };
  
  // Generic logout function for all tenant users
  const handleLogout = async () => {
      // We need a general logout API
      await fetch('/api/auth/logout', { method: 'POST' }); 
      router.push('/login');
  };

  if (isLoading) return <div className="text-center p-10">Loading branch data...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Branch Dashboard</h1>

             <Link href="/dashboard/shipments" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
                        Go to Shipments
                    </Link>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
            Logout
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section for listing existing staff */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Your Staff</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr key={user._id} className="border-b">
                      <td className="p-3">{user.name}</td>
                      <td className="p-3">{user.email}</td>
                      <td className="p-3 capitalize">{user.role}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-3 text-center">No staff members have been added yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section for adding new staff */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Add New Staff</h2>
          <form onSubmit={handleAddUser}>
            <div className="mb-4">
                <label className="block text-gray-700 mb-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" required />
            </div>
            <div className="mb-4">
                <label className="block text-gray-700 mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" required />
            </div>
            <div className="mb-4">
                <label className="block text-gray-700 mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded" required />
            </div>
             <div className="mb-4">
                <label className="block text-gray-700 mb-1">Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-2 border rounded">
                    <option value="staff">Staff (Delivery)</option>
                    {/* Add more roles here later if needed */}
                </select>
            </div>
            {formError && <p className="text-red-500 text-sm mb-4">{formError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
                Add User
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}