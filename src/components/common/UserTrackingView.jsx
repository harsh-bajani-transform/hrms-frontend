import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';
import SearchableSelect from './SearchableSelect';

const UserTrackingView = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [roleOptions, setRoleOptions] = useState([]);
  const [updatingPermission, setUpdatingPermission] = useState(null);

  // Fetch users and roles on mount
  useEffect(() => {
    fetchUsers();
    fetchRoleDropdown();
  }, []);

  // Fetch users by role when roleFilter changes (except 'all')
  useEffect(() => {
    if (roleFilter === 'all') {
      fetchUsers();
    } else {
      fetchUsersByRole(roleFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  // Fetch users by role
  const fetchUsersByRole = async (roleId) => {
    try {
      setLoading(true);
      const selectedRole = roleOptions.find(opt => String(opt.role_id) === String(roleId));
      const roleLabel = selectedRole ? selectedRole.label : '';
      if (!user?.user_id || !roleLabel) {
        setUsers([]);
        setLoading(false);
        return;
      }
      const response = await api.post('/permission/user_list', {
        logged_in_user_id: user.user_id,
        role: roleLabel
      });
      let userArray = [];
      if (response.data?.status === 200) {
        const innerData = response.data.data;
        if (Array.isArray(innerData)) {
          userArray = innerData;
        } else if (innerData && Array.isArray(innerData.users)) {
          userArray = innerData.users;
        } else if (innerData && Array.isArray(innerData.user_list)) {
          userArray = innerData.user_list;
        } else {
          for (const key in innerData) {
            if (Array.isArray(innerData[key])) {
              userArray = innerData[key];
              break;
            }
          }
        }
        setUsers(userArray);
      } else {
        setUsers([]);
      }
    } catch (error) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch role dropdown data from API
  const fetchRoleDropdown = async () => {
    try {
      const response = await api.post('/dropdown/get', { dropdown_type: 'user roles' });
      if (response.data?.status === 200 && Array.isArray(response.data.data)) {
        setRoleOptions(response.data.data);
      } else {
        setRoleOptions([]);
      }
    } catch (error) {
      setRoleOptions([]);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Log user_id and token for debugging
      const token = sessionStorage.getItem('tfs_auth_token');
      console.log('Sending user_id:', user?.user_id, 'Token:', token);

      if (!user?.user_id) {
        toast.error('User ID missing. Please login again.');
        setUsers([]);
        setLoading(false);
        return;
      }

      const response = await api.post('/permission/user_list', {
        logged_in_user_id: user.user_id
      });

      console.log('API /permission/user_list response:', response.data);
      console.log('API /permission/user_list inner data:', response.data?.data);
      let userArray = [];
      if (response.data?.status === 200) {
        const innerData = response.data.data;
        if (Array.isArray(innerData)) {
          userArray = innerData;
        } else if (innerData && Array.isArray(innerData.users)) {
          userArray = innerData.users;
        } else if (innerData && Array.isArray(innerData.user_list)) {
          userArray = innerData.user_list;
        } else {
          // Try to find any array property
          for (const key in innerData) {
            if (Array.isArray(innerData[key])) {
              userArray = innerData[key];
              break;
            }
          }
        }
        if (userArray.length > 0) {
          setUsers(userArray);
        } else {
          toast.error('API returned success but no user array found.');
          setUsers([]);
        }
      } else {
        toast.error('Failed to load users');
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error loading users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Map user role to label for filter matching
  const getRoleLabel = (roleIdOrName) => {
    if (!roleIdOrName) return '';
    // Try to match by role_id
    const found = roleOptions.find(opt => String(opt.role_id) === String(roleIdOrName) || opt.label === roleIdOrName);
    return found ? found.label : roleIdOrName;
  };

  // Filter users: search only by name and email (role filter now handled by API)
  const filteredUsers = useMemo(() => {
    const safeUsers = Array.isArray(users) ? users : [];
    return safeUsers.filter(userData => {
      return (
        userData.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        userData.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [users, searchQuery]);

  // Handle permission toggle
  const handlePermissionToggle = async (targetUserId, permissionType, currentValue) => {
    const permissionKey = `${targetUserId}-${permissionType}`;
    setUpdatingPermission(permissionKey);

    try {
      // Find the target user to get both permission values
      const targetUser = users.find(u => u.user_id === targetUserId);
      
      const payload = {
        user_id: user.user_id,
        target_user_id: targetUserId,
        project_creation_permission: permissionType === 'project' 
          ? (currentValue === 1 ? 0 : 1) 
          : (targetUser?.project_creation_permission || 0),
        user_creation_permission: permissionType === 'user' 
          ? (currentValue === 1 ? 0 : 1) 
          : (targetUser?.user_creation_permission || 0)
      };

      const response = await api.post('/permission/update', payload);
      
      if (response.data) {
        // Update local state
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.user_id === targetUserId 
              ? {
                  ...u,
                  [permissionType === 'project' ? 'project_creation_permission' : 'user_creation_permission']: currentValue === 1 ? 0 : 1
                }
              : u
          )
        );
        toast.success(`Permission ${currentValue === 1 ? 'revoked' : 'granted'} successfully!`);
      }
    } catch (error) {
      console.error('Error updating permission:', error);
      toast.error(error.response?.data?.message || 'Failed to update permission');
    } finally {
      setUpdatingPermission(null);
    }
  };

  // Format role options for SearchableSelect
  const formattedRoleOptions = [
    { value: 'all', label: 'All Roles' },
    ...roleOptions.map(role => ({ value: String(role.role_id), label: role.label }))
  ];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight cursor-default">User Permissions</h2>
              <p className="text-slate-600 text-sm font-medium mt-1 cursor-default">Manage user access and permissions</p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-6 border border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all"
                />
              </div>
            </div>

            {/* Role Filter Dropdown */}
            <div className="w-full sm:w-48">
              <SearchableSelect
                value={roleFilter}
                onChange={setRoleFilter}
                options={formattedRoleOptions}
                icon={Filter}
                placeholder="All Roles"
                isClearable={false}
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        {filteredUsers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg text-center py-16 border border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No users found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      User Name
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                      User Creation
                    </th>
                    <th className="px-5 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                      Project Creation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map((userData, index) => (
                    <tr key={userData.user_id} className={`hover:bg-slate-50 transition-colors group ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-900 font-bold">
                        {index + 1}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-slate-800">{userData.user_name}</div>
                        {userData.designation && (
                          <div className="text-xs text-slate-500 font-medium mt-0.5">{userData.designation}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {userData.user_email}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                          userData.role === 'Admin' ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-700 border border-purple-200' :
                          userData.role === 'Manager' ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200' :
                          'bg-gradient-to-r from-green-50 to-green-100 text-green-700 border border-green-200'
                        }`}>
                          {userData.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handlePermissionToggle(userData.user_id, 'user', userData.user_creation_permission)}
                          disabled={updatingPermission === `${userData.user_id}-user`}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                            userData.user_creation_permission === 1 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-slate-300'
                          }`}
                          title={userData.user_creation_permission === 1 ? 'Enabled' : 'Disabled'}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                              userData.user_creation_permission === 1 ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handlePermissionToggle(userData.user_id, 'project', userData.project_creation_permission)}
                          disabled={updatingPermission === `${userData.user_id}-project`}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
                            userData.project_creation_permission === 1 ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-slate-300'
                          }`}
                          title={userData.project_creation_permission === 1 ? 'Enabled' : 'Disabled'}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                              userData.project_creation_permission === 1 ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Results Count Footer */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600 font-medium">
                  Showing <span className="font-bold text-blue-700">{filteredUsers.length}</span> of <span className="font-bold text-blue-700">{users.length}</span> users
                </p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-slate-500 font-medium">Live Data</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTrackingView;