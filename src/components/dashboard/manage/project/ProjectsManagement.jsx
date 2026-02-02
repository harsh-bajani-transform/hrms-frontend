import React from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from "../../../../context/AuthContext";
import { useProjectManagement } from "../../../../hooks/useProjectManagement";


import AddProjectForm from './AddProjectForm';
import EditProjectModal from './EditProjectModal';
import ProjectCard from './ProjectCard';
import DeleteProjectModal from './DeleteProjectModal';
import { useUserDropdowns } from "../../../../hooks/useUserDropdowns";
import { fetchProjectsList } from '../../../../services/projectService';

// Utility to normalize dropdown data
const normalizeDropdown = (arr, type = 'user') => {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => {
    if (Array.isArray(item) && item.length > 0) item = item[0];
    return {
      id: item.user_id || item.team_id || item.id,
      user_id: item.user_id || item.team_id || item.id,
      team_id: item.team_id,
      label: item.label || item.name || item.user_name || item.team_name || '',
      name: item.name || item.label || item.user_name || item.team_name || '',
    };
  });
};


const ProjectsManagement = ({
  projects = [],
  onUpdateProjects,
  loading = false,
  loadProjects,
  projectManagers = [],
  assistantManagers = [],
  qaManagers = [],
  // eslint-disable-next-line no-unused-vars
  teams = [],
  readOnly = false
}) => {
  const { canManageProjects, isSuperAdmin, user } = useAuth();
  const isAdmin = user?.role_name === 'admin';

  const {
    dropdowns,
    loading: dropdownLoading,
    loadDropdowns
  } = useUserDropdowns();

  const {
    newProject,
    projectFiles,
    formErrors,
    isSubmitting,
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
    handleUpdateTask,
    handleDeleteTask,
    clearFieldError,
    handleProjectFilesChange,
    handleRemoveProjectFile,
    handleModalClose,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
  } = useProjectManagement(projects, onUpdateProjects, loadProjects);

  // Only show if user has permission to edit projects
  if (!canManageProjects && !isSuperAdmin && !isAdmin) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 text-yellow-800 flex items-center gap-3">
        <Lock className="w-5 h-5" />
        <div>
          <h3 className="font-bold">Access Denied</h3>
          <p className="text-sm">You don't have permission to manage projects.</p>
        </div>
      </div>
    );
  }

  // Map the data for the old form compatibility
  const potentialOwners = projectManagers.map(pm => ({
    id: pm.id,
    name: pm.name
  }));

  const potentialAPMs = assistantManagers.map(am => ({
    id: am.id,
    name: am.name
  }));

  const potentialQAs = qaManagers.map(qa => ({
    id: qa.id,
    name: qa.name
  }));

  // Wrapper function to load dropdowns before opening edit modal
  const handleOpenEditModal = async (project) => {
    await loadDropdowns();
    let fullProject = project;
    try {
      const res = await fetchProjectsList(user?.user_id);
      if (res && Array.isArray(res.data)) {
        // Find the project by project_id (API uses project_id, not id)
        const found = res.data.find(p => String(p.project_id) === String(project.project_id || project.id));
        if (found) fullProject = found;
      }
    } catch (e) {
      // fallback to passed project if fetch fails
    }
    // Map API response arrays to expected fields for EditProjectModal
    // Use qa_user_ids for QA Manager(s) as per API response
    let qaManagerIds = [];
    if (Array.isArray(fullProject.qa_user_ids) && fullProject.qa_user_ids.length > 0) {
      qaManagerIds = fullProject.qa_user_ids;
    }

    fullProject = {
      ...fullProject,
      // Map all possible selected fields for EditProjectModal
      assistantManagerIds: fullProject.assistantManagerIds || fullProject.asst_project_manager_ids || fullProject.asst_project_managers || [],
      qaManagerIds,
      teamIds: fullProject.teamIds || fullProject.project_team_ids || fullProject.project_team || [],
      asst_project_managers: fullProject.asst_project_managers || [],
      qa_users: fullProject.qa_users || [],
      project_team: fullProject.project_team || [],
      assistantManagers: normalizeDropdown(dropdowns.assistantManagers),
      qaManagers: normalizeDropdown(dropdowns.qas),
      teams: normalizeDropdown(dropdowns.agents, 'team'),
      projectManagers: normalizeDropdown(dropdowns.projectManagers)
    };
    console.log('ProjectsManagement: project with mapped arrays', fullProject);
    openEditModal(fullProject);
  };

  // Normalize dropdowns for AddProjectForm and EditProjectModal
  const normalizedProjectManagers = normalizeDropdown(dropdowns.projectManagers);
  const normalizedAssistantManagers = normalizeDropdown(dropdowns.assistantManagers);
  const normalizedQaManagers = normalizeDropdown(dropdowns.qas);
  const normalizedTeams = normalizeDropdown(dropdowns.agents, 'team');

  // Expanded state for each project card
  const [expandedCards, setExpandedCards] = React.useState({});

  const handleExpandCard = (projectId, value) => {
    setExpandedCards(prev => ({ ...prev, [projectId]: value }));
  };

  // Project Name filter state
  const [projectNameSearch, setProjectNameSearch] = React.useState("");

  // Filtered projects by project name
  const filteredProjects = React.useMemo(() => {
    if (!projectNameSearch.trim()) return projects;
    return projects.filter(p => (p.name || p.project_name || "").toLowerCase().includes(projectNameSearch.trim().toLowerCase()));
  }, [projects, projectNameSearch]);

  return (
    <div className="space-y-8 animate-fade-in p-4 md:p-0 w-full overflow-x-hidden">
      {/* Project Name search filter is now inside AddProjectForm */}

      {!readOnly && !isEditMode && (
        <AddProjectForm
          newProject={newProject}
          onFieldChange={updateNewProjectField}
          onSubmit={handleAddProject}
          // ⬇️ normalized dropdown data
          projectManagers={normalizedProjectManagers}
          assistantManagers={normalizedAssistantManagers}
          qaManagers={normalizedQaManagers}
          teams={normalizedTeams}
          loadDropdowns={loadDropdowns}
          dropdownLoading={dropdownLoading}
          isSubmitting={isSubmitting}
          formErrors={formErrors}
          clearFieldError={clearFieldError}
          projectFiles={projectFiles}
          handleProjectFilesChange={handleProjectFilesChange}
          handleRemoveProjectFile={handleRemoveProjectFile}
          handleModalClose={handleModalClose}
          projectNameSearch={projectNameSearch}
          setProjectNameSearch={setProjectNameSearch}
        />
      )}

      {showEditModal && isEditMode && (
        <EditProjectModal
          project={newProject}
          onClose={closeEditModal}
          onUpdate={handleUpdateProject}
          projectManagers={normalizedProjectManagers}
          assistantManagers={normalizedAssistantManagers}
          qaManagers={normalizedQaManagers}
          teams={normalizedTeams}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
          handleProjectFilesChange={handleProjectFilesChange}
          handleRemoveProjectFile={handleRemoveProjectFile}
        />
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg font-semibold">No projects found</p>
          <p className="text-sm">Create your first project using the form above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredProjects.map(proj => (
            <ProjectCard
              key={proj.id}
              project={proj}
              readOnly={readOnly || !canManageProjects}
              potentialOwners={potentialOwners}
              potentialAPMs={potentialAPMs}
              potentialQAs={potentialQAs}
              onDeleteProject={handleDeleteProject}
              onUpdateTarget={(id, v) => handleUpdateProjectField(id, 'monthlyHoursTarget', v)}
              onUpdateOwner={(id, v) => handleUpdateProjectField(id, 'teamOwner', v)}
              onUpdateAPM={(id, v) => handleUpdateProjectField(id, 'apmOwner', v)}
              onUpdateQA={(id, v) => handleUpdateProjectField(id, 'qaOwner', v)}
              onUpdateName={(id, v) => handleUpdateProjectField(id, 'name', v)}
              onAddTask={handleAddTask}
              onUpdateTask={handleUpdateTask}
              onDeleteTask={handleDeleteTask}
              openEditModal={handleOpenEditModal}
              openDeleteModal={openDeleteModal}
              expanded={!!expandedCards[proj.id]}
              setExpanded={value => handleExpandCard(proj.id, value)}
            />
          ))}
        </div>
      )}

      {/* Delete Project Modal */}
      {showDeleteModal && (
        <DeleteProjectModal
          project={deletingProject}
          onClose={closeDeleteModal}
          onConfirm={handleDeleteProject}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};
export default ProjectsManagement;