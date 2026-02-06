// import { useState } from 'react';

// export const useProjectManagement = (initialProjects, onUpdateProjects) => {
//      const [newProject, setNewProject] = useState({
//           name: '',
//           description: '',
//           projectManagerId: '',
//           assistantManagerIds: [],
//           qaManagerIds: [],
//           teamIds: [],
//           files: [],
//      });

//      const [projectFiles, setProjectFiles] = useState([]);
//      const [formErrors, setFormErrors] = useState({});

//      const handleAddProject = () => {
//           // Validation
//           const errors = {};
//           if (!newProject.name.trim()) errors.name = 'Project name is required';
//           if (!newProject.projectManagerId) errors.projectManagerId = 'Project manager is required';


//           if (Object.keys(errors).length > 0) {
//                setFormErrors(errors);
//                return false;
//           }

//           const project = {
//                project_name: newProject.name.trim(),
//                project_description: newProject.description?.trim() || null,

//                // single select → STRING
//                project_manager_id: String(newProject.projectManagerId),

//                // multi select → ARRAY OF STRINGS
//                asst_project_manager_id: (newProject.assistantManagerIds || []).map(String),

//                qa_id: (newProject.qaManagerIds || []).map(String),

//                project_team_id: (newProject.teamIds || []).map(String),

//                // optional
//                files: projectFiles,
//           };

//           onUpdateProjects([...initialProjects, project]);
//           resetNewProjectForm();
//           setProjectFiles([]);
//           setFormErrors({});
//           return true;
//      };

//      const getManagerName = (id) => {
//           // This would come from your API data
//           return '';
//      };

//      const handleDeleteProject = (id) => {
//           if (window.confirm('Delete project?')) {
//                onUpdateProjects(initialProjects.filter(p => p.id !== id));
//           }
//      };

//      const handleUpdateProjectField = (id, field, value) => {
//           const updated = initialProjects.map(p =>
//                p.id === id ? { ...p, [field]: value } : p
//           );
//           onUpdateProjects(updated);
//      };

//      const handleAddTask = (projectId, taskName, target) => {
//           if (!taskName.trim() || !target) {
//                alert('Task name and target are required');
//                return;
//           }

//           const updatedProjects = initialProjects.map(p => {
//                if (p.id === projectId) {
//                     return {
//                          ...p,
//                          tasks: [
//                               ...p.tasks,
//                               {
//                                    id: crypto.randomUUID(),
//                                    name: taskName.trim(),
//                                    targetPerHour: parseInt(target)
//                               }
//                          ]
//                     };
//                }
//                return p;
//           });

//           onUpdateProjects(updatedProjects);
//      };

//      const handleDeleteTask = (projectId, taskId) => {
//           const updatedProjects = initialProjects.map(p => {
//                if (p.id === projectId) {
//                     return {
//                          ...p,
//                          tasks: p.tasks.filter(t => t.id !== taskId)
//                     };
//                }
//                return p;
//           });

//           onUpdateProjects(updatedProjects);
//      };

//      const resetNewProjectForm = () => {
//           setNewProject({
//                name: '',
//                description: '',
//                projectManagerId: '',
//                assistantManagerIds: [],
//                qaManagerIds: [],
//                teamIds: [],
//                files: []
//           });
//      };

//      const updateNewProjectField = (field, value) => {
//           setNewProject(prev => ({ ...prev, [field]: value }));
//           // Clear error for this field if it exists
//           if (formErrors[field]) {
//                setFormErrors(prev => ({ ...prev, [field]: '' }));
//           }
//      };

//      const clearFieldError = (field) => {
//           setFormErrors(prev => ({ ...prev, [field]: '' }));
//      };

//      const handleProjectFilesChange = (files) => {
//           setProjectFiles(prev => {
//                const existingNames = prev.map(f => f.name);
//                const uniqueFiles = files.filter(f => !existingNames.includes(f.name));
//                return [...prev, ...uniqueFiles];
//           });
//      };


//      const handleRemoveProjectFile = (index) => {
//           setProjectFiles(prev => prev.filter((_, i) => i !== index));
//      };

//      return {
//           newProject,
//           projectFiles,
//           formErrors,
//           updateNewProjectField,
//           handleAddProject,
//           handleDeleteProject,
//           handleUpdateProjectField,
//           handleAddTask,
//           handleDeleteTask,
//           resetNewProjectForm,
//           clearFieldError,
//           handleProjectFilesChange,
//           handleRemoveProjectFile
//      };
// };












// useProjectManagement.js
import { useState } from 'react';
import { addTask, createProject, updateProject, deleteProject, updateTask, deleteTask as deleteTaskApi } from '../services/projectService';
import { toast } from "react-hot-toast";
import { useDeviceInfo } from "./useDeviceInfo";

export const useProjectManagement = (initialProjects, onUpdateProjects, loadProjects) => {
     const deviceInfo = useDeviceInfo();
     const [newProject, setNewProject] = useState({
          name: '',
          code: '',
          description: '',
          projectManagerId: '',
          assistantManagerIds: [],
          qaManagerIds: [],
          teamIds: [],
     });

     const [projectFiles, setProjectFiles] = useState([]);
     const [formErrors, setFormErrors] = useState({});
     const [isSubmitting, setIsSubmitting] = useState(false);
     const [submitSuccess, setSubmitSuccess] = useState(false);
     const [isEditMode, setIsEditMode] = useState(false);
     const [editingProjectId, setEditingProjectId] = useState(null);
     const [showEditModal, setShowEditModal] = useState(false);
     const [showDeleteModal, setShowDeleteModal] = useState(false);
     const [deletingProject, setDeletingProject] = useState(null);
     const [isDeleting, setIsDeleting] = useState(false);

     const handleAddProject = async () => {
          const errors = {};

          if (!newProject.name?.trim()) {
               errors.name = "This field is required";
          }

          if (!newProject.projectManagerId) {
               errors.projectManagerId = "This field is required";
          }

          if (!newProject.assistantManagerIds?.length) {
               errors.assistantManagerIds = "This field is required";
          }

          if (!newProject.qaManagerIds?.length) {
               errors.qaManagerIds = "This field is required";
          }

          if (!newProject.teamIds?.length) {
               errors.teamIds = "This field is required";
          }

          if (Object.keys(errors).length > 0) {
               setFormErrors(errors);
               return false; // ⛔ STOP HERE
          }

          setIsSubmitting(true);

          try {
               // Create FormData instead of JSON payload
               const formData = new FormData();
               
               // Append basic fields
               formData.append('project_name', newProject.name.trim());
               formData.append('project_code', newProject.code.trim());
               formData.append('project_description', newProject.description?.trim() || '');
               formData.append('project_manager_id', Number(newProject.projectManagerId));
               
               // Append array fields as JSON strings (backend expects this format)
               formData.append('asst_project_manager_id', JSON.stringify(newProject.assistantManagerIds.map(id => Number(id))));
               formData.append('project_qa_id', JSON.stringify(newProject.qaManagerIds.map(id => Number(id))));
               formData.append('project_team_id', JSON.stringify(newProject.teamIds.map(id => Number(id))));
               
               // Append file if exists
               if (projectFiles && projectFiles.length > 0) {
                    formData.append('file', projectFiles[0]);
               }
               
               // Append device info
               formData.append('device_id', deviceInfo.device_id);
               formData.append('device_type', deviceInfo.device_type);
               
               // Debug log
               console.log('[AddProject] FormData entries:');
               for (let pair of formData.entries()) {
                    console.log(pair[0], pair[1]);
               }

               const response = await createProject(formData);

               if (response?.status === 200 || response?.status === 201) {
                    resetNewProjectForm();
                    setProjectFiles([]);
                    setFormErrors({});
                    // Show success message
                    toast.success("Project created successfully!", {
                         className: "toast-success toast-animate",
                         duration: 4000,
                    });
                    
                    // Refresh the project list
                    if (loadProjects) {
                         await loadProjects();
                    }
                    
                    return true; // ✅ SUCCESS
               } else {
                    throw new Error(response.message || "Failed to create project");
               }

          } catch (err) {
               console.error("Error adding project:", err);
               toast.error(`Error creating project: ${err.message}`, {
                    className: "toast-error toast-animate",
                    duration: 4000,
               });
               return false;
          } finally {
               setIsSubmitting(false);
          }
     };

     // Add function to open edit modal with project data
     const openEditModal = (project) => {
          if (!project) return;
          // Map API project fields to newProject state for editing
          setNewProject({
               name: project.name || project.project_name || '',
               code: project.code || project.project_code || '',
               description: project.description || project.project_description || '',
               projectManagerId: String(project.projectManagerId || project.project_manager_id || ''),
               assistantManagerIds: (project.assistantManagerIds
                    ? project.assistantManagerIds.map(String)
                    : project.asst_project_managers?.map(u => String(u.user_id)) || []),
               qaManagerIds: (project.qaManagerIds
                    ? project.qaManagerIds.map(String)
                    : project.qa_users?.map(u => String(u.user_id)) || []),
               teamIds: (project.teamIds
                    ? project.teamIds.map(String)
                    : project.project_team?.map(u => String(u.user_id)) || []),
          });
          // Patch: Set projectFiles as an array with a dummy File-like object if project.project_file exists
          if (project.project_file) {
               setProjectFiles([
                    {
                         name: project.project_file,
                         // Optionally add type and size if available, else use defaults
                         type: '',
                         size: 0,
                         // Add a preview or url if you want to support download/view
                    }
               ]);
          } else {
               setProjectFiles([]);
          }
          setEditingProjectId(project.project_id || project.id);
          setIsEditMode(true);
          setShowEditModal(true);
          // Clear any existing errors
          setFormErrors({});
     };

     // Add function to handle project update
     const handleUpdateProject = async (editedProject) => {
          // Similar validation as handleAddProject
          const errors = {};

          const projectData = editedProject || newProject;
          if (!projectData.name?.trim()) {
               errors.name = "This field is required";
          }

          if (!projectData.code?.trim()) {
               errors.code = "This field is required";
          }

          if (!projectData.projectManagerId) {
               errors.projectManagerId = "This field is required";
          }

          if (!projectData.assistantManagerIds?.length) {
               errors.assistantManagerIds = "This field is required";
          }

          if (!projectData.qaManagerIds?.length) {
               errors.qaManagerIds = "This field is required";
          }

          if (!projectData.teamIds?.length) {
               errors.teamIds = "This field is required";
          }

          if (Object.keys(errors).length > 0) {
               setFormErrors(errors);
               return false;
          }

          setIsSubmitting(true);

          try {
               // Create FormData instead of JSON payload
               const formData = new FormData();
               
               // Append basic fields
               formData.append('project_name', projectData.name.trim());
               formData.append('project_code', projectData.code.trim());
               formData.append('project_description', projectData.description?.trim() || '');
               formData.append('project_manager_id', Number(projectData.projectManagerId));
               
               // Append array fields as JSON strings (backend expects this format)
               formData.append('asst_project_manager_id', JSON.stringify(projectData.assistantManagerIds.map(id => Number(id))));
               formData.append('project_qa_id', JSON.stringify(projectData.qaManagerIds.map(id => Number(id))));
               formData.append('project_team_id', JSON.stringify(projectData.teamIds.map(id => Number(id))));
               
               // Append file if exists (only if user selected a new file, not existing)
               if (projectFiles && projectFiles.length > 0) {
                    // Check if it's a real File object (new upload) vs existing file metadata
                    const file = projectFiles[0];
                    if (file instanceof File) {
                         formData.append('file', file);
                    }
               }
               
               // Append device info
               formData.append('device_id', deviceInfo.device_id);
               formData.append('device_type', deviceInfo.device_type);
               
               // Debug log
               console.log('[UpdateProject] FormData entries:');
               for (let pair of formData.entries()) {
                    console.log(pair[0], pair[1]);
               }

               const response = await updateProject(editingProjectId, formData);

               if (response?.status === 200 || response?.status === 201) {
                    toast.success("Project updated successfully!", {
                         className: "toast-success toast-animate",
                         duration: 4000,
                    });

                    // Refresh the project list
                    if (loadProjects) {
                         await loadProjects();
                    }

                    closeEditModal();
                    return true;

               } else {
                    throw new Error(response.message || "Failed to update project");
               }

          } catch (err) {
               console.error("Error updating project:", err);
               toast.error(`Error updating project: ${err.message}`, {
                    className: "toast-error toast-animate",
                    duration: 4000,
               });
               return false;
          } finally {
               setIsSubmitting(false);
          }
     };

     // Add function to close edit modal
     const closeEditModal = () => {
          setShowEditModal(false);
          setIsEditMode(false);
          setEditingProjectId(null);
          resetNewProjectForm();
     };

     // Add function to open delete modal
     const openDeleteModal = (project) => {
          setDeletingProject(project);
          setShowDeleteModal(true);
     };

     // Add function to close delete modal
     const closeDeleteModal = () => {
          setShowDeleteModal(false);
          setDeletingProject(null);
     };

     // Add function to handle project deletion
     const handleDeleteProject = async () => {
          if (!deletingProject) return;

          setIsDeleting(true);

          try {
               const response = await deleteProject(deletingProject.id);

               if (response?.status === 200 || response?.status === 201) {
                    toast.success("Project deleted successfully!", {
                         className: "toast-success toast-animate",
                         duration: 4000,
                    });

                    // Refresh the project list
                    if (loadProjects) {
                         await loadProjects();
                    }

                    closeDeleteModal();
                    return true;

               } else {
                    throw new Error(response.message || "Failed to delete project");
               }

          } catch (err) {
               console.error("Error deleting project:", err);
               console.error("Error response:", err.response);
               toast.error(`Error deleting project: ${err.response?.data?.message || err.message}`, {
                    className: "toast-error toast-animate",
                    duration: 4000,
               });
               return false;
          } finally {
               setIsDeleting(false);
          }
     };

     const handleUpdateProjectField = async (id, field, value) => {
          const projectToUpdate = initialProjects.find(p => p.id === id);
          if (!projectToUpdate) return;

          try {
               const updatePayload = {
                    [field]: value
               };

               await updateProject(id, updatePayload);

               // Update local state
               const updated = initialProjects.map(p =>
                    p.id === id ? { ...p, [field]: value } : p
               );
               onUpdateProjects(updated);
          } catch (error) {
               console.error('Failed to update project:', error);
               alert('Failed to update project. Please try again.');
          }
     };

     const handleAddTask = async (projectId, taskPayload) => {
          if (!projectId) {
               toast.error("Missing project id for task");
               return false;
          }

          const name = taskPayload?.name?.trim();
          const target = taskPayload?.target;
          const teamIds = taskPayload?.teamIds || [];

          if (!name || !target || teamIds.length === 0) {
               toast.error("Please fill task name, target, and select at least one agent");
               return false;
          }

          const payload = {
               project_id: projectId,
               task_team_id: teamIds.map(id => Number(id)),
               task_name: name,
               task_description: taskPayload?.description?.trim() || "",
               task_target: String(target),
               device_id: deviceInfo.device_id,
               device_type: deviceInfo.device_type,
          };

          try {
               const response = await addTask(payload);

               if (response?.status === 200 || response?.status === 201) {
                    toast.success("Task added successfully", {
                         className: "toast-success toast-animate",
                         duration: 4000,
                    });

                    if (loadProjects) {
                         await loadProjects();
                    }

                    return true;
               }

               throw new Error(response?.message || "Failed to add task");
          } catch (error) {
               console.error("Error adding task:", error);
               toast.error(error.response?.data?.message || error.message || "Failed to add task", {
                    className: "toast-error toast-animate",
                    duration: 4000,
               });
               return false;
          }
     };

     const handleUpdateTask = async (projectId, taskId, taskPayload) => {
          if (!projectId || !taskId) {
               toast.error("Missing project or task id");
               return false;
          }

          const name = taskPayload?.name?.trim();
          const target = taskPayload?.target;
          const teamIds = taskPayload?.teamIds || [];

          if (!name || !target || teamIds.length === 0) {
               toast.error("Please fill task name, target, and select at least one agent");
               return false;
          }

          const payload = {
               project_id: projectId,
               task_id: taskId,
               task_team_id: teamIds.map(id => Number(id)),
               task_name: name,
               task_description: taskPayload?.description?.trim() || "",
               task_target: String(target),
               device_id: deviceInfo.device_id,
               device_type: deviceInfo.device_type,
          };

          try {
               const response = await updateTask(payload);

               if (response?.status === 200 || response?.status === 201) {
                    toast.success("Task updated successfully", {
                         className: "toast-success toast-animate",
                         duration: 4000,
                    });

                    if (loadProjects) {
                         await loadProjects();
                    }

                    return true;
               }

               throw new Error(response?.message || "Failed to update task");
          } catch (error) {
               console.error("Error updating task:", error);
               toast.error(error.response?.data?.message || error.message || "Failed to update task", {
                    className: "toast-error toast-animate",
                    duration: 4000,
               });
               return false;
          }
     };

     const handleDeleteTask = async (projectId, taskId) => {
          if (!taskId) return false;

          try {
               const response = await deleteTaskApi({ project_id: projectId, task_id: taskId });

               if (response?.status === 200 || response?.status === 201) {
                    toast.success("Task deleted successfully", {
                         className: "toast-success toast-animate",
                         duration: 4000,
                    });

                    if (loadProjects) {
                         await loadProjects();
                    }

                    return true;
               }

               throw new Error(response?.message || "Failed to delete task");
          } catch (error) {
               console.error("Error deleting task:", error);
               toast.error(error.response?.data?.message || error.message || "Failed to delete task", {
                    className: "toast-error toast-animate",
                    duration: 4000,
               });
               return false;
          }
     };

     const resetNewProjectForm = () => {
          setNewProject({
               name: '',
               code: '',
               description: '',
               projectManagerId: '',
               assistantManagerIds: [],
               qaManagerIds: [],
               teamIds: [],
          });
          setProjectFiles([]);
          setFormErrors({});
          setSubmitSuccess(false);
          setIsEditMode(false);
          setEditingProjectId(null);
     };

     const updateNewProjectField = (field, value) => {
          setNewProject(prev => ({ ...prev, [field]: value }));
          // Clear error for this field if it exists
          if (formErrors[field]) {
               setFormErrors(prev => ({ ...prev, [field]: '' }));
          }
     };

     const clearFieldError = (field) => {
          setFormErrors(prev => ({ ...prev, [field]: '' }));
     };

     // const handleProjectFilesChange = (files) => {
     //      setProjectFiles(prev => {
     //           const existingNames = prev.map(f => f.name);
     //           const uniqueFiles = files.filter(f => !existingNames.includes(f.name));
     //           return [...prev, ...uniqueFiles];
     //      });
     // };

     const handleProjectFilesChange = (files) => {
          // files can be a FileList, array, or single File
          let newFiles = [];
          if (Array.isArray(files)) {
               newFiles = files;
          } else if (files instanceof FileList) {
               newFiles = Array.from(files);
          } else if (files instanceof File) {
               newFiles = [files];
          }
          setProjectFiles(prev => {
               // Prevent duplicates by name
               const existingNames = prev.map(f => f.name);
               const uniqueFiles = newFiles.filter(f => !existingNames.includes(f.name));
               return [...prev, ...uniqueFiles];
          });
     };

     const handleRemoveProjectFile = (index) => {
          setProjectFiles(prev => prev.filter((_, i) => i !== index));
     };

     // Add modal close handler
     const handleModalClose = () => {
          resetNewProjectForm();
          setProjectFiles(null);
          setFormErrors({});
     };

     return {
          newProject,
          projectFiles,
          formErrors,
          isSubmitting,
          submitSuccess,
          isEditMode,
          showEditModal,
          editingProjectId,
          showDeleteModal,
          deletingProject,
          isDeleting,
          updateNewProjectField,
          handleAddProject,
          handleUpdateProject,
          handleDeleteProject,
          handleUpdateProjectField,
          handleAddTask,
          handleDeleteTask,
          resetNewProjectForm,
          clearFieldError,
          handleProjectFilesChange,
          handleRemoveProjectFile,
          handleModalClose,
          openEditModal, 
          closeEditModal,
          openDeleteModal,
          closeDeleteModal,
     };
};