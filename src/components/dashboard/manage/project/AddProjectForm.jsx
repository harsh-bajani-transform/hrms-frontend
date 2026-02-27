import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import AddProjectFormModal from './AddProjectFormModal';

const AddProjectForm = ({
     newProject,
     potentialOwners = [],
     potentialAPMs = [],
     potentialQAs = [],
     onFieldChange,
     onSubmit,
     onUpdateSubmit,
     projectManagers = [],
     assistantManagers = [],
     qaManagers = [],
     teams = [],
     projectCategories = [],
     loadDropdowns,
     formErrors = {},
     clearFieldError,
     projectFiles = [],
     handleProjectFilesChange,
     handleRemoveProjectFile,
     isSubmitting = false,
     handleModalClose,
     isEditMode = false,
     showEditModal = false,
     closeEditModal,
     dropdownLoading = false,
     projectNameSearch = "",
     setProjectNameSearch
}) => {
     const [showModal, setShowModal] = useState(false);

     // Open edit modal when edit mode changes, only if dropdowns are loaded and not empty
     useEffect(() => {
          const openEditModalWithData = async () => {
               if (showEditModal) {
                    await loadDropdowns();
                    setShowModal(true);
               }
          };
          openEditModalWithData();
     }, [showEditModal, loadDropdowns]);

     const openModal = async () => {
          await loadDropdowns(); // 🔥 API CALL HERE
          setShowModal(true);
     };

     const handleCloseModal = async () => {
          await handleModalClose();
          setShowModal(false);
          if (closeEditModal) {
               closeEditModal();
          }
     };

     const handleSubmit = async () => {
          const successSubmit = isEditMode ? onUpdateSubmit : onSubmit;
          const success = await successSubmit();
          if (success) {
               setShowModal(false);
          }
     };

     return (
          <>
               {!isEditMode && (
                    <button
                         onClick={openModal}
                         className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 min-w-[140px]"
                    >
                         <Plus className="w-4 h-4" /> Add Project
                    </button>
               )}

               {showModal && (
                    dropdownLoading ? (
                         <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
                              <div className="bg-white rounded-xl shadow-2xl p-8 flex flex-col items-center">
                                   <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                   <span className="text-blue-700 font-semibold">Loading project data...</span>
                              </div>
                         </div>
                    ) : (
                         <AddProjectFormModal
                              newProject={newProject}
                              onFieldChange={onFieldChange}
                              onSubmit={handleSubmit}
                              onClose={handleCloseModal}
                              projectManagers={projectManagers || []}
                              assistantManagers={assistantManagers || []}
                              qaManagers={qaManagers || []}
                              teams={teams || []}
                              projectCategories={projectCategories || []}
                              formErrors={formErrors}
                              clearFieldError={clearFieldError}
                              isSubmitting={isSubmitting}
                              projectFiles={projectFiles}
                              handleProjectFilesChange={handleProjectFilesChange}
                              handleRemoveProjectFile={handleRemoveProjectFile}
                              isEditMode={isEditMode}
                         />
                    )
               )}
          </>
     );
};

export default AddProjectForm;