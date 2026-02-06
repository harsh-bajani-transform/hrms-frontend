import React, { useRef, useState, useEffect } from "react";
import { Briefcase, X, Upload, XCircle, ChevronDown, Check, User } from "lucide-react";
import CustomSelect from "../../../common/CustomSelect";

const AddProjectFormModal = ({
     newProject,
     onFieldChange,
     onSubmit,
     onClose,
     projectManagers = [],
     assistantManagers = [],
     qaManagers = [],
     teams = [],
     formErrors = {},
     clearFieldError,
     isSubmitting = false,
     handleProjectFilesChange,
     handleRemoveProjectFile,
     projectFiles,
     isEditMode = false,
}) => {
     const fileInputRef = useRef(null);
     const dropdownRefs = {
          assistantManagers: useRef(null),
          qaManagers: useRef(null),
          teams: useRef(null),
     };
     const [dropdownOpen, setDropdownOpen] = useState({
          assistantManagers: false,
          qaManagers: false,
          teams: false,
     });

     // Debug logs for edit mode
     // In edit mode, ensure selected IDs are set from project data if not already set
     useEffect(() => {
          if (isEditMode && newProject) {
               // Helper to extract string IDs from any array of IDs or objects
               const extractIds = (arr, key = 'user_id') => {
                    if (!arr) return [];
                    if (Array.isArray(arr) && typeof arr[0] === 'object') {
                         return arr.map(u => String(u[key] ?? u.id)).filter(Boolean);
                    }
                    return arr.map(id => String(id)).filter(Boolean);
               };

               // Only update if not already set (avoid overwriting user changes)
               if ((!newProject.assistantManagerIds || newProject.assistantManagerIds.length === 0) && newProject.asst_project_managers) {
                    const ids = extractIds(newProject.asst_project_managers, 'user_id');
                    onFieldChange('assistantManagerIds', ids);
               }
               if ((!newProject.qaManagerIds || newProject.qaManagerIds.length === 0) && newProject.qa_users) {
                    const ids = extractIds(newProject.qa_users, 'user_id');
                    onFieldChange('qaManagerIds', ids);
               }
               if ((!newProject.teamIds || newProject.teamIds.length === 0) && newProject.project_team) {
                    const ids = extractIds(newProject.project_team, 'user_id');
                    onFieldChange('teamIds', ids);
               }
          }
     }, [isEditMode, newProject, onFieldChange]);

     // Handle multiple selection - Updated to handle array of objects
     const handleMultipleSelect = (field, userId, isChecked) => {
          const currentValues = newProject[field] || [];
          let updatedValues;

          if (isChecked) {
               // Add userId if not already present
               if (!currentValues.includes(userId)) {
                    updatedValues = [...currentValues, userId];
               } else {
                    updatedValues = currentValues;
               }
          } else {
               // Remove userId
               updatedValues = currentValues.filter(id => id !== userId);
          }

          onFieldChange(field, updatedValues);
     };

     // Handle Select All functionality for multi-select dropdowns
     const handleSelectAll = (field, allItems, isChecked) => {
          if (isChecked) {
               // Select all items
               const allIds = allItems.map(item => item.user_id || item.team_id);
               onFieldChange(field, allIds);
          } else {
               // Deselect all items
               onFieldChange(field, []);
          }
     };

     // Check if item is selected
     const isSelected = (field, userId) => {
          const currentValues = newProject[field] || [];
          return currentValues.includes(userId);
     };

     // Get selected items labels for display
     const getSelectedItemsDisplay = (field, items) => {
          const currentValues = newProject[field] || [];
          if (currentValues.length === 0) return "Select...";

          const selectedItems = items.filter(item => currentValues.includes(item.user_id || item.team_id));

          if (selectedItems.length > 2) {
               return `${selectedItems.length} selected`;
          }
          return selectedItems.map(item => item.label).join(", ");
     };

     // Helper function to get items with consistent structure
     const getItemsWithConsistentStructure = (items) => {
          if (!items || items.length === 0) return [];

          // Handle different data structures
          return items.map(item => {
               // If it's an array of arrays, get the first object
               if (Array.isArray(item) && item.length > 0) {
                    const firstItem = item[0];
                    return {
                         id: firstItem.user_id || firstItem.team_id,
                         label: firstItem.label,
                         user_id: firstItem.user_id || firstItem.team_id,
                         team_id: firstItem.team_id,
                    };
               }

               // If it's already an object
               return {
                    id: item.user_id || item.team_id,
                    label: item.label,
                    user_id: item.user_id || item.team_id,
                    team_id: item.team_id,
               };
          });
     };

     // Get processed items
     const processedAssistantManagers = getItemsWithConsistentStructure(assistantManagers);
     const processedQaManagers = getItemsWithConsistentStructure(qaManagers);
     const processedTeams = getItemsWithConsistentStructure(teams);
     const processedProjectManagers = getItemsWithConsistentStructure(projectManagers);

     const toggleDropdown = (dropdown) => {
          setDropdownOpen(prev => ({
               // Close all dropdowns first
               assistantManagers: false,
               qaManagers: false,
               teams: false,
               // Open the clicked one
               [dropdown]: !prev[dropdown]
          }));
     };

     const handleFileChange = (e) => {
          const files = e.target.files;
          if (files && files.length > 0) {
               handleProjectFilesChange(files);
          }
          e.target.value = "";
     };

     const triggerFileInput = () => {
          fileInputRef.current.click();
     };

     // Close all dropdowns when clicking outside
     const handleClickOutside = (e) => {
          if (!e.target.closest('.dropdown-container')) {
               setDropdownOpen({
                    assistantManagers: false,
                    qaManagers: false,
                    teams: false,
               });
          }
     };

     useEffect(() => {
          document.addEventListener('mousedown', handleClickOutside);
          return () => {
               document.removeEventListener('mousedown', handleClickOutside);
          };
     }, []);

     // Reset scroll position when dropdown opens
     useEffect(() => {
          if (dropdownOpen.assistantManagers && dropdownRefs.assistantManagers.current) {
               dropdownRefs.assistantManagers.current.scrollTop = 0;
          }
          if (dropdownOpen.qaManagers && dropdownRefs.qaManagers.current) {
               dropdownRefs.qaManagers.current.scrollTop = 0;
          }
          if (dropdownOpen.teams && dropdownRefs.teams.current) {
               dropdownRefs.teams.current.scrollTop = 0;
          }
     }, [dropdownOpen]);

     return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                    <div className="p-4 bg-blue-800 text-white flex justify-between items-center shrink-0">
                         <div>
                              <h2 className="text-lg font-bold flex items-center gap-2">
                                   <Briefcase className="w-5 h-5 text-blue-300" />
                                   {isEditMode ? "Edit Project" : "Create New Project"}
                              </h2>
                              <p className="text-blue-200 text-xs">
                                   {isEditMode
                                        ? "Update project details as needed"
                                        : "Fill all required details to create a new project"}
                              </p>
                         </div>
                         <button
                              onClick={onClose}
                              className="p-1 hover:bg-white/10 rounded-full transition-colors"
                         >
                              <X className="w-5 h-5 text-white" />
                         </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Project Name */}
                              <div>
                                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Project Name <span className="text-red-600">*</span>
                                   </label>
                                   <input
                                        type="text"
                                        className="block w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. MoveEasy Platform"
                                        value={newProject.name}
                                        onChange={(e) => {
                                             onFieldChange("name", e.target.value);
                                             clearFieldError?.("name");
                                        }}
                                        required
                                   />
                                   {formErrors.name && (
                                        <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                                   )}
                              </div>

                              {/* Project Code */}
                              <div>
                                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Project Code <span className="text-red-600">*</span>
                                   </label>
                                   <input
                                        type="text"
                                        className="block w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. MOVE123"
                                        value={newProject.code}
                                        onChange={(e) => {
                                             onFieldChange("code", e.target.value);
                                             clearFieldError?.("code");
                                        }}
                                        required
                                   />
                                   {formErrors.code && (
                                        <p className="mt-1 text-xs text-red-600">{formErrors.code}</p>
                                   )}
                              </div>

                              {/* Description */}
                              <div>
                                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Project Description
                                   </label>
                                   <textarea
                                        className="block w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 h-12 resize-none"
                                        placeholder="Describe the project scope and features..."
                                        value={newProject.description}
                                        onChange={(e) => onFieldChange("description", e.target.value)}
                                   />
                              </div>

                              {/* Project Manager */}
                              <div>
                                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Project Manager <span className="text-red-600">*</span>
                                   </label>
                                   <CustomSelect
                                        value={newProject.projectManagerId ? String(newProject.projectManagerId) : ""}
                                        onChange={(val) => {
                                             onFieldChange("projectManagerId", val);
                                             clearFieldError?.("projectManagerId");
                                        }}
                                        options={[
                                             { value: "", label: "Select Project Manager" },
                                             ...processedProjectManagers.map((pm) => ({ value: String(pm.user_id), label: pm.label }))
                                        ]}
                                        icon={User}
                                        placeholder="Select Project Manager"
                                   />
                                   {formErrors.projectManagerId && (
                                        <p className="mt-1 text-xs text-red-600">
                                             {formErrors.projectManagerId}
                                        </p>
                                   )}
                              </div>

                              {/* Assistant Project Manager - Multi Select */}
                              <div className="relative dropdown-container">
                                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Assistant Project Manager(s) <span className="text-red-600">*</span>
                                   </label>
                                   <div className="relative">
                                        <button
                                             type="button"
                                             className="flex items-center justify-between w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100"
                                             onClick={() => toggleDropdown("assistantManagers")}
                                        >
                                             <span className="truncate">
                                                  {getSelectedItemsDisplay('assistantManagerIds', processedAssistantManagers)}
                                             </span>
                                             <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.assistantManagers ? 'transform rotate-180' : ''}`} />
                                        </button>

                                        {dropdownOpen.assistantManagers && (
                                             <div ref={dropdownRefs.assistantManagers} className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                                  {/* Select All Option */}
                                                  <label className="flex items-center px-3 py-2 hover:bg-green-50 cursor-pointer border-b border-gray-200 bg-gray-50">
                                                       <input
                                                            type="checkbox"
                                                            checked={processedAssistantManagers.length > 0 && (newProject.assistantManagerIds || []).length === processedAssistantManagers.length}
                                                            onChange={(e) => handleSelectAll('assistantManagerIds', processedAssistantManagers, e.target.checked)}
                                                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                       />
                                                       <span className="ml-2 text-sm font-semibold text-gray-900">Select All</span>
                                                  </label>
                                                  {/* Show each user only once, checked if selected */}
                                                  {[
                                                       ...newProject.assistantManagerIds
                                                            .map((id, idx) => processedAssistantManagers.find(am => String(am.user_id) === String(id)) || { user_id: id, label: `Unknown (${id})`, _idx: idx }),
                                                       ...processedAssistantManagers.filter(am => !newProject.assistantManagerIds.includes(am.user_id))
                                                  ].map((am, idx) => (
                                                       <label
                                                            key={am.user_id + '-' + (am._idx !== undefined ? am._idx : idx)}
                                                            className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                                       >
                                                            <input
                                                                 type="checkbox"
                                                                 checked={isSelected('assistantManagerIds', am.user_id)}
                                                                 onChange={(e) => handleMultipleSelect('assistantManagerIds', am.user_id, e.target.checked)}
                                                                 className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">
                                                                 {am.label}
                                                            </span>
                                                       </label>
                                                  ))}
                                             </div>
                                        )}
                                        {formErrors.assistantManagerIds && (
                                             <p className="mt-1 text-xs text-red-600">
                                                  {formErrors.assistantManagerIds}
                                             </p>
                                        )}

                                   </div>
                                   {newProject.assistantManagerIds?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                             {newProject.assistantManagerIds.map((id, idx) => {
                                                  const am = processedAssistantManagers.find(a => String(a.user_id ?? a.id) === String(id));
                                                  return am ? (
                                                       <span key={id + '-' + idx} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                                            {am.label}
                                                            <button
                                                                 type="button"
                                                                 onClick={() => handleMultipleSelect('assistantManagerIds', id, false)}
                                                                 className="text-blue-600 hover:text-blue-800"
                                                            >
                                                                 &times;
                                                            </button>
                                                       </span>
                                                  ) : null;
                                             })}
                                        </div>
                                   )}
                              </div>

                              {/* Quality Analyst - Multi Select */}
                              <div className="relative dropdown-container">
                                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Quality Analyst(s) <span className="text-red-600">*</span>
                                   </label>
                                   <div className="relative">
                                        <button
                                             type="button"
                                             className="flex items-center justify-between w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100"
                                             onClick={() => toggleDropdown('qaManagers')}
                                        >
                                             <span className="truncate">
                                                  {getSelectedItemsDisplay('qaManagerIds', processedQaManagers)}
                                             </span>
                                             <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.qaManagers ? 'transform rotate-180' : ''}`} />
                                        </button>
                                        {dropdownOpen.qaManagers && (
                                             <div ref={dropdownRefs.qaManagers} className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                                  {/* Select All Option */}
                                                  <label className="flex items-center px-3 py-2 hover:bg-purple-50 cursor-pointer border-b border-gray-200 bg-gray-50">
                                                       <input
                                                            type="checkbox"
                                                            checked={processedQaManagers.length > 0 && (newProject.qaManagerIds || []).length === processedQaManagers.length}
                                                            onChange={(e) => handleSelectAll('qaManagerIds', processedQaManagers, e.target.checked)}
                                                            className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                                       />
                                                       <span className="ml-2 text-sm font-semibold text-gray-900">Select All</span>
                                                  </label>
                                                  {/* Show each user only once, checked if selected */}
                                                  {[
                                                       ...newProject.qaManagerIds
                                                            .map((id, idx) => processedQaManagers.find(qa => String(qa.user_id) === String(id)) || { user_id: id, label: `Unknown (${id})`, _idx: idx }),
                                                       ...processedQaManagers.filter(qa => !newProject.qaManagerIds.includes(qa.user_id))
                                                  ].map((qa, idx) => (
                                                       <label
                                                            key={qa.user_id + '-' + (qa._idx !== undefined ? qa._idx : idx)}
                                                            className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                                       >
                                                            <input
                                                                 type="checkbox"
                                                                 checked={isSelected('qaManagerIds', qa.user_id)}
                                                                 onChange={(e) => handleMultipleSelect('qaManagerIds', qa.user_id, e.target.checked)}
                                                                 className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">
                                                                 {qa.label}
                                                            </span>
                                                       </label>
                                                  ))}
                                             </div>
                                        )}
                                   </div>
                                   {newProject.qaManagerIds?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                             {newProject.qaManagerIds.map((id, idx) => {
                                                  const qa = processedQaManagers.find(q => String(q.user_id ?? q.id) === String(id));
                                                  return qa ? (
                                                       <span key={id + '-' + idx} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                                            {qa.label}
                                                            <button
                                                                 type="button"
                                                                 onClick={() => handleMultipleSelect('qaManagerIds', id, false)}
                                                                 className="text-green-600 hover:text-green-800"
                                                            >
                                                                 &times;
                                                            </button>
                                                       </span>
                                                  ) : null;
                                             })}
                                        </div>
                                   )}
                                   {formErrors.qaManagerIds && (
                                        <p className="mt-1 text-xs text-red-600">
                                             {formErrors.qaManagerIds}
                                        </p>
                                   )}
                              </div>

                              {/* Team Assignment - Multi Select */}
                              <div className="relative dropdown-container">
                                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Agent(s) <span className="text-red-600">*</span>
                                   </label>
                                   <div className="relative">
                                        <button
                                             type="button"
                                             className="flex items-center justify-between w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100"
                                             onClick={() => toggleDropdown('teams')}
                                        >
                                             <span className="truncate">
                                                  {getSelectedItemsDisplay('teamIds', processedTeams)}
                                             </span>
                                             <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen.teams ? 'transform rotate-180' : ''}`} />
                                        </button>
                                        {dropdownOpen.teams && (
                                             <div ref={dropdownRefs.teams} className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                                  {/* Select All Option */}
                                                  <label className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-200 bg-gray-50">
                                                       <input
                                                            type="checkbox"
                                                            checked={processedTeams.length > 0 && (newProject.teamIds || []).length === processedTeams.length}
                                                            onChange={(e) => handleSelectAll('teamIds', processedTeams, e.target.checked)}
                                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                       />
                                                       <span className="ml-2 text-sm font-semibold text-gray-900">Select All</span>
                                                  </label>
                                                  {processedTeams.map((team) => (
                                                       <label
                                                            key={team.user_id}
                                                            className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                                                       >
                                                            <input
                                                                 type="checkbox"
                                                                 checked={isSelected('teamIds', team.user_id)}
                                                                 onChange={(e) => handleMultipleSelect('teamIds', team.user_id, e.target.checked)}
                                                                 className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                            />
                                                            <span className="ml-2 text-sm text-gray-700">
                                                                 {team.label}
                                                            </span>
                                                       </label>
                                                  ))}
                                             </div>
                                        )}
                                   </div>
                                   {newProject.teamIds?.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                             {newProject.teamIds.map(id => {
                                                  const team = processedTeams.find(t => String(t.user_id ?? t.id) === String(id));
                                                  return team ? (
                                                       <span key={id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
                                                            {team.label}
                                                            <button
                                                                 type="button"
                                                                 onClick={() => handleMultipleSelect('teamIds', id, false)}
                                                                 className="text-purple-600 hover:text-purple-800"
                                                            >
                                                                 &times;
                                                            </button>
                                                       </span>
                                                  ) : null;
                                             })}
                                        </div>
                                   )}
                                   {formErrors.teamIds && (
                                        <p className="mt-1 text-xs text-red-600">
                                             {formErrors.teamIds}
                                        </p>
                                   )}
                              </div>

                              {/* Project Files Upload */}
                              {/* <div className="md:col-span-1">
                                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Project Files
                                   </label>

                                   <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        multiple
                                        onChange={handleFileChange}
                                   />

                                   <div className="flex items-center gap-3">
                                        <div
                                             onClick={triggerFileInput}
                                             className="
                                               flex items-center justify-between
                                               w-full px-3 py-3
                                               text-sm bg-gray-50
                                               border border-gray-200 rounded-lg
                                               cursor-pointer
                                               hover:bg-gray-100
                                               focus-within:ring-2 focus-within:ring-blue-500
                                             "
                                        >
                                             <div className="flex items-center gap-2 text-gray-600">
                                                  <Upload className="w-4 h-4" />
                                                  {projectFiles.length > 0 ? (
                                                       <span>{projectFiles.length} file(s) selected</span>
                                                  ) : (
                                                       <span>Select project files</span>
                                                  )}
                                             </div>

                                             <span className="text-blue-600 text-xs font-medium">
                                                  Browse
                                             </span>
                                        </div>
                                   </div>

                                   {projectFiles.length > 0 && (
                                        <div className="mt-1 space-y-1">
                                             {projectFiles.map((file, index) => (
                                                  <div
                                                       key={`${file.name}-${index}`}
                                                       className="
                                                         flex items-center justify-between
                                                         px-3 py-1
                                                         border border-gray-200
                                                         rounded-md
                                                         text-sm
                                                         bg-white
                                                       "
                                                  >
                                                       <span className="truncate text-red-600 text-xs max-w-[85%]">
                                                            {file.name}
                                                       </span>

                                                       <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                 e.stopPropagation();
                                                                 handleRemoveProjectFile(index);
                                                            }}
                                                            className="text-gray-400 hover:text-red-500"
                                                            title="Remove file"
                                                       >
                                                            <XCircle className="w-4 h-4" />
                                                       </button>
                                                  </div>
                                             ))}
                                        </div>
                                   )}
                              </div> */}

                              <div className="md:col-span-1">
                                   <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Project Files
                                   </label>

                                   <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        multiple
                                        onChange={handleFileChange}
                                   />

                                   <div className="flex items-center gap-3">
                                        <div
                                             onClick={triggerFileInput}
                                             className="
        flex items-center justify-between
        w-full px-3 py-3
        text-sm bg-gray-50
        border border-gray-200 rounded-lg
        cursor-pointer
        hover:bg-gray-100
        focus-within:ring-2 focus-within:ring-blue-500
      "
                                        >
                                             <div className="flex items-center gap-2 text-gray-600">
                                                  <Upload className="w-4 h-4" />
                                                  {projectFiles && projectFiles.length > 0 ? (
                                                       <span>{projectFiles.length} file(s) selected</span>
                                                  ) : (
                                                       <span>Select project files</span>
                                                  )}
                                             </div>

                                             <span className="text-blue-600 text-xs font-medium">
                                                  Browse
                                             </span>
                                        </div>
                                   </div>

                                   {projectFiles && projectFiles.length > 0 && (
                                        <div className="mt-1 space-y-1">
                                             {projectFiles.map((file, index) => {
                                                  const isExistingFile = !(file instanceof File);
                                                  return (
                                                       <div
                                                            key={`${file.name}-${index}`}
                                                            className="
          flex items-center justify-between
          px-3 py-1
          border border-gray-200
          rounded-md
          text-sm
          bg-white
        "
                                                       >
                                                            <span className={`truncate text-xs max-w-[85%] ${isExistingFile ? 'text-blue-600' : 'text-red-600'}`}>
                                                                 {file.name}
                                                            </span>
                                                            {isExistingFile ? (
                                                                 <span className="text-green-600 text-xs font-medium">Existing</span>
                                                            ) : (
                                                                 <button
                                                                      type="button"
                                                                      onClick={(e) => {
                                                                           e.stopPropagation();
                                                                           handleRemoveProjectFile(index);
                                                                      }}
                                                                      className="text-gray-400 hover:text-red-500"
                                                                      title="Remove file"
                                                                 >
                                                                      <XCircle className="w-4 h-4" />
                                                                 </button>
                                                            )}
                                                       </div>
                                                  );
                                             })}
                                        </div>
                                   )}
                              </div>

                         </div>
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                         <button
                              onClick={onSubmit}
                              disabled={isSubmitting}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                         >
                              {isSubmitting ? (
                                   <>
                                        <svg
                                             className="animate-spin h-4 w-4 text-white"
                                             xmlns="http://www.w3.org/2000/svg"
                                             fill="none"
                                             viewBox="0 0 24 24"
                                        >
                                             <circle
                                                  className="opacity-25"
                                                  cx="12"
                                                  cy="12"
                                                  r="10"
                                                  stroke="currentColor"
                                                  strokeWidth="4"
                                             ></circle>
                                             <path
                                                  className="opacity-75"
                                                  fill="currentColor"
                                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                             ></path>
                                        </svg>
                                        {isEditMode ? "Updating..." : "Creating..."}
                                   </>
                              ) : isEditMode ? (
                                   "Update Project"
                              ) : (
                                   "Create Project"
                              )}
                         </button>
                    </div>
               </div>
          </div>
     );
};

export default AddProjectFormModal;









{
     /* Monthly Hours Target */
}
{
     /* <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Monthly Hours Target <span className="text-red-600">*</span>
                 </label>
                 <input
                   type="number"
                   className="block w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="e.g. 720"
                   value={newProject.monthlyHoursTarget}
                   onChange={(e) => {
                     onFieldChange('monthlyHoursTarget', e.target.value);
                     clearFieldError?.("monthlyHoursTarget");
                   }}
                   min="0"
                   required
                 />
                 {formErrors.monthlyHoursTarget && (
                   <p className="mt-1 text-xs text-red-600">{formErrors.monthlyHoursTarget}</p>
                 )}
               </div> */
}

{
     /* Start Date */
}
{
     /* <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Project Start Date
                 </label>
                 <input
                   type="date"
                   className="block w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
                   value={newProject.startDate}
                   onChange={(e) => onFieldChange('startDate', e.target.value)}
                 />
               </div> */
}

{
     /* End Date */
}
{
     /* <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Project End Date (Estimated)
                 </label>
                 <input
                   type="date"
                   className="block w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
                   value={newProject.endDate}
                   onChange={(e) => onFieldChange('endDate', e.target.value)}
                 />
               </div> */
}

{
     /* Project Status */
}
{
     /* <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Project Status
                 </label>
                 <select
                   className="block w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
                   value={newProject.status}
                   onChange={(e) => onFieldChange('status', e.target.value)}
                 >
                   <option value="PLANNING">Planning</option>
                   <option value="ACTIVE">Active</option>
                   <option value="ON_HOLD">On Hold</option>
                   <option value="COMPLETED">Completed</option>
                   <option value="CANCELLED">Cancelled</option>
                 </select>
               </div> */
}

{
     /* Budget
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Project Budget ($)
                 </label>
                 <div className="relative">
                   <span className="absolute left-3 top-3 text-gray-500">$</span>
                   <input
                     type="number"
                     className="block w-full pl-8 pr-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
                     placeholder="0.00"
                     value={newProject.budget}
                     onChange={(e) => onFieldChange('budget', e.target.value)}
                     min="0"
                     step="0.01"
                   />
                 </div>
               </div>
   
               Client Name 
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Client Name
                 </label>
                 <input
                   type="text"
                   className="block w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="Client Company Name"
                   value={newProject.clientName}
                   onChange={(e) => onFieldChange('clientName', e.target.value)}
                 />
               </div>
   
                Client Email
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-2">
                   Client Email
                 </label>
                 <input
                   type="email"
                   className="block w-full px-3 py-3 text-sm bg-gray-50 border border-gray-200 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="client@company.com"
                   value={newProject.clientEmail}
                   onChange={(e) => onFieldChange('clientEmail', e.target.value)}
                 />
               </div> */
}
