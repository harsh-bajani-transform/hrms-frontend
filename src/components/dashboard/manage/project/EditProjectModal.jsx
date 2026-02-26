import React, { useRef, useState, useEffect } from "react";
import { Briefcase, X, Upload, XCircle, User, Users } from "lucide-react";
import { log, logError } from "../../../../config/environment";
import SearchableSelect from "../../../common/SearchableSelect";
import MultiSelectWithCheckbox from "../../../common/MultiSelectWithCheckbox";

const EditProjectModal = ({
	project,
	onClose,
	onUpdate,
	projectManagers = [],
	assistantManagers = [],
	qaManagers = [],
	teams = [],
	projectCategories = [],
	formErrors = {},
	isSubmitting = false,
	handleProjectFilesChange,
	handleRemoveProjectFile,
	projectFiles,
	onFieldChange,
	clearFieldError,
}) => {
	const fileInputRef = useRef(null);
	const [editProject, setEditProject] = useState(null);

	// Initialize editProject from project prop
	useEffect(() => {
		if (project) {
			console.log('[EditProjectModal] ========== INITIALIZING EDIT PROJECT ==========');
			console.log('[EditProjectModal][DEBUG] Incoming project prop:', project);
			console.log('[EditProjectModal][DEBUG] Incoming projectManagers prop:', projectManagers);
			console.log('[EditProjectModal][DEBUG] Incoming assistantManagers prop:', assistantManagers);
			console.log('[EditProjectModal][DEBUG] Incoming qaManagers prop:', qaManagers);
			console.log('[EditProjectModal][DEBUG] Incoming teams prop:', teams);

			// Helper to extract string IDs from any array of IDs or objects
			const extractIds = (arr, key = 'user_id') => {
				if (!arr) return [];
				if (Array.isArray(arr) && typeof arr[0] === 'object') {
					return arr.map(u => String(u[key] ?? u.id)).filter(Boolean);
				}
				return arr.map(id => String(id)).filter(Boolean);
			};

			// Defensive: force all dropdown options to string IDs (local variables)
			const normalizedAssistantManagers = Array.isArray(assistantManagers) && assistantManagers.length > 0
				? assistantManagers.map(item => ({
						id: String(item.user_id ?? item.team_id ?? item.id),
						label: item.user_name || item.label || item.team_name || item.name || String(item.user_id ?? item.team_id ?? item.id)
					}))
				: [];
			const normalizedQaManagers = Array.isArray(qaManagers) && qaManagers.length > 0
				? qaManagers.map(item => ({
						id: String(item.user_id ?? item.team_id ?? item.id),
						label: item.user_name || item.label || item.team_name || item.name || String(item.user_id ?? item.team_id ?? item.id)
					}))
				: [];
			const normalizedTeams = Array.isArray(teams) && teams.length > 0
				? teams.map(item => ({
						id: String(item.user_id ?? item.team_id ?? item.id),
						label: item.user_name || item.label || item.team_name || item.name || String(item.user_id ?? item.team_id ?? item.id)
					}))
				: [];

			console.log('[EditProjectModal][DEBUG] normalizedAssistantManagers:', normalizedAssistantManagers);
			console.log('[EditProjectModal][DEBUG] normalizedQaManagers:', normalizedQaManagers);
			console.log('[EditProjectModal][DEBUG] normalizedTeams:', normalizedTeams);


			// --- DEBUG: Log all possible project fields for mapping ---
			console.log('[EditProjectModal][DEBUG] Raw project fields:', {
				assistantManagerIds: project.assistantManagerIds,
				asst_project_managers: project.asst_project_managers,
				asst_project_manager_id: project.asst_project_manager_id,
				qaManagerIds: project.qaManagerIds,
				qa_users: project.qa_users,
				project_qa_id: project.project_qa_id,
				teamIds: project.teamIds,
				project_team: project.project_team,
				project_team_id: project.project_team_id
			});

			// Assistant Project Managers
			let assistantManagerIds = [];
			if (Array.isArray(project.assistantManagerIds) && project.assistantManagerIds.length > 0) {
				assistantManagerIds = extractIds(project.assistantManagerIds, 'user_id');
			} else if (Array.isArray(project.asst_project_managers) && project.asst_project_managers.length > 0) {
				// Accept both array of objects and array of ids
				if (typeof project.asst_project_managers[0] === 'object') {
					assistantManagerIds = extractIds(project.asst_project_managers, 'user_id');
				} else {
					assistantManagerIds = project.asst_project_managers.map(String);
				}
			} else if (Array.isArray(project.asst_project_manager_id) && project.asst_project_manager_id.length > 0) {
				assistantManagerIds = project.asst_project_manager_id.map(String);
			}
			console.log('[EditProjectModal][DEBUG] Assistant Manager IDs:', assistantManagerIds);

			// QA Managers
			let qaManagerIds = [];
			if (Array.isArray(project.qaManagerIds) && project.qaManagerIds.length > 0) {
				qaManagerIds = extractIds(project.qaManagerIds, 'user_id');
			} else if (Array.isArray(project.qa_users) && project.qa_users.length > 0) {
				if (typeof project.qa_users[0] === 'object') {
					qaManagerIds = extractIds(project.qa_users, 'user_id');
				} else {
					qaManagerIds = project.qa_users.map(String);
				}
			} else if (Array.isArray(project.project_qa_id) && project.project_qa_id.length > 0) {
				if (typeof project.project_qa_id[0] === 'object') {
					qaManagerIds = extractIds(project.project_qa_id, 'user_id');
				} else {
					qaManagerIds = project.project_qa_id.map(String);
				}
			} else if (Array.isArray(project.project_qa_ids) && project.project_qa_ids.length > 0) {
				if (typeof project.project_qa_ids[0] === 'object') {
					qaManagerIds = extractIds(project.project_qa_ids, 'user_id');
				} else {
					qaManagerIds = project.project_qa_ids.map(String);
				}
			}
			console.log('[EditProjectModal][DEBUG] QA Manager IDs:', qaManagerIds);

			// Agents/Teams
			let teamIds = [];
			if (Array.isArray(project.teamIds) && project.teamIds.length > 0) {
				teamIds = extractIds(project.teamIds, 'user_id');
			} else if (Array.isArray(project.project_team) && project.project_team.length > 0) {
				if (typeof project.project_team[0] === 'object') {
					teamIds = extractIds(project.project_team, 'user_id');
				} else {
					teamIds = project.project_team.map(String);
				}
			} else if (Array.isArray(project.project_team_id) && project.project_team_id.length > 0) {
				teamIds = project.project_team_id.map(String);
			}
			console.log('[EditProjectModal][DEBUG] Team IDs:', teamIds);

			const newProject = {
				...project,
				assistantManagerIds,
				qaManagerIds,
				teamIds,
				projectManagerId: String(project.projectManagerId || project.project_manager_id || ""),
				// projectCategoryId: String(project.projectCategoryId || project.project_category_id || ""),
				name: project.name || project.project_name || "",
				code: project.code || project.project_code || "",
				description: project.description || project.project_description || "",
			};

			console.log('[EditProjectModal][DEBUG] newProject state to set:', newProject);

			setTimeout(() => {
				setEditProject(newProject);
			}, 0);
		}
	}, [project, assistantManagers, qaManagers, teams]);

	// Helper to normalize dropdown data for lookup by id
	const normalizeList = (items, idKey = 'user_id', labelKey = 'user_name') => {
		if (!Array.isArray(items)) return [];
		return items
			.map(item => {
				const id = String(item.project_category_id ?? item[idKey] ?? item.team_id ?? item.id ?? '');
				const label = item[labelKey] || item.label || item.user_name || item.team_name || item.name || id;
				return { id, label };
			})
			.filter(item => item.id !== null && item.id !== undefined && String(item.id) !== 'undefined');
	};

	const processedAssistantManagers = normalizeList(assistantManagers, 'user_id', 'user_name');
	const processedQaManagers = normalizeList(qaManagers, 'user_id', 'user_name');
	const processedTeams = normalizeList(teams, 'user_id', 'user_name');
	const processedProjectManagers = normalizeList(projectManagers, 'user_id', 'user_name');
	const processedProjectCategories = normalizeList(projectCategories, 'project_category_id', 'label');
	
	// console.log('[EditProjectModal] Project Categories:', {
	// 	raw: projectCategories,
	// 	processed: processedProjectCategories
	// });
	
	// Build options for project category
	// const projectCategoryOptions = [
	// 	{ value: "", label: "Select Category" },
	// 	...processedProjectCategories
	// 		.filter((cat) => cat.id !== null && cat.id !== undefined && String(cat.id) !== 'undefined')
	// 		.map((cat) => ({ value: cat.id, label: cat.label }))
	// ];
	
	// console.log('[EditProjectModal] Final category options:', projectCategoryOptions);

	const handleFileChange = (e) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			log('[EditProjectModal] File selected:', files[0].name);
			handleProjectFilesChange && handleProjectFilesChange(files);
		}
		e.target.value = "";
	};

	const triggerFileInput = () => {
		fileInputRef.current.click();
	};

	const handleRemoveFile = (index) => {
		log('[EditProjectModal] Removing file at index:', index);
		handleRemoveProjectFile && handleRemoveProjectFile(index);
	};

	if (!editProject) {
		return (
			<div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
				<div className="bg-white rounded-xl shadow-2xl p-8">Loading...</div>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[98vh] flex flex-col overflow-hidden animate-fade-in-up">
			<div className="p-3 bg-blue-800 text-white flex justify-between items-center shrink-0">
				<div>
					<h2 className="text-lg font-bold flex items-center gap-2">
						<Briefcase className="w-5 h-5 text-blue-300" />
						Edit Project
					</h2>
					<p className="text-blue-200 text-xs">Update project details as needed</p>
				</div>
				<button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
					<X className="w-5 h-5 text-white" />
				</button>
			</div>
			<div className="flex-1 overflow-y-auto p-3 md:p-4 bg-white">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{/* Project Name */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">Project Name <span className="text-red-600">*</span></label>
							<input
								type="text"
							className="block w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="e.g. MoveEasy Platform"
							value={editProject.name}
							onChange={e => setEditProject(prev => ({ ...prev, name: e.target.value }))}
							required
						/>
						{formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
					</div>
					{/* Project Code */}
					<div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">Project Code <span className="text-red-600">*</span></label>
						<input
							type="text"
							className="block w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								placeholder="e.g. MOVE"
								value={editProject.code || ''}
								onChange={e => {
									const uppercaseValue = e.target.value.toUpperCase();
									setEditProject(prev => ({ ...prev, code: uppercaseValue }));
									if (clearFieldError) {
										clearFieldError('code');
									}
									if (onFieldChange) {
										onFieldChange('code', uppercaseValue);
									}
								}}
								required
							/>
							{formErrors.code && <p className="mt-1 text-xs text-red-600">{formErrors.code}</p>}
						</div>
						{/* Description */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">Project Description</label>
							<textarea
							className="block w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 resize-none"
								placeholder="Describe the project scope and features..."
								value={editProject.description}
								onChange={e => setEditProject(prev => ({ ...prev, description: e.target.value }))}
							/>
						</div>					{/* Project Category */}
					{/* <div>
						<label className="block text-sm font-semibold text-gray-700 mb-2">
							Project Category
						</label>
						<SearchableSelect
							value={editProject.projectCategoryId || ""}
							onChange={(val) => {
								setEditProject(prev => ({ ...prev, projectCategoryId: val }));
								if (clearFieldError) {
									clearFieldError('projectCategoryId');
								}
								if (onFieldChange) {
									onFieldChange('projectCategoryId', val);
								}
							}}
						options={projectCategoryOptions}
							icon={Briefcase}
							placeholder="Select Category"
							error={!!formErrors.projectCategoryId}
							errorMessage={formErrors.projectCategoryId}
						/>
					</div> */}						{/* Project Manager */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								Project Manager <span className="text-red-600">*</span>
							</label>
							<SearchableSelect
								value={editProject.projectManagerId}
								onChange={(val) => setEditProject(prev => ({ ...prev, projectManagerId: val }))}
								options={[
									{ value: "", label: "Select Project Manager" },
									...processedProjectManagers.map((pm) => ({ value: pm.id, label: pm.label }))
								]}
								icon={User}
								placeholder="Select Project Manager"
								error={!!formErrors.projectManagerId}
								errorMessage={formErrors.projectManagerId}
							/>
						</div>
						{/* Assistant Project Manager - Multi Select */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								Assistant Project Manager(s) <span className="text-red-600">*</span>
							</label>
							<MultiSelectWithCheckbox
								value={editProject.assistantManagerIds || []}
								onChange={(val) => {
									setEditProject(prev => ({ ...prev, assistantManagerIds: val }));
									if (onFieldChange) onFieldChange('assistantManagerIds', val);
									if (clearFieldError) clearFieldError('assistantManagerIds');
								}}
								options={processedAssistantManagers.map((am) => ({ value: am.id, label: am.label }))}
								icon={Users}
								placeholder="Select Assistant Project Managers"
								error={!!formErrors.assistantManagerIds}
								errorMessage={formErrors.assistantManagerIds}
								maxDisplayCount={2}
							/>
						</div>
						{/* QA Manager - Multi Select */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								Quality Analyst(s) <span className="text-red-600">*</span>
							</label>
							<MultiSelectWithCheckbox
								value={editProject.qaManagerIds || []}
								onChange={(val) => {
									setEditProject(prev => ({ ...prev, qaManagerIds: val }));
									if (onFieldChange) onFieldChange('qaManagerIds', val);
									if (clearFieldError) clearFieldError('qaManagerIds');
								}}
								options={processedQaManagers.map((qa) => ({ value: qa.id, label: qa.label }))}
								icon={Users}
								placeholder="Select Quality Analysts"
								error={!!formErrors.qaManagerIds}
								errorMessage={formErrors.qaManagerIds}
								maxDisplayCount={2}
							/>
						</div>
						{/* Team Assignment - Multi Select */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								Agent(s) <span className="text-red-600">*</span>
							</label>
							<MultiSelectWithCheckbox
								value={editProject.teamIds || []}
								onChange={(val) => {
									setEditProject(prev => ({ ...prev, teamIds: val }));
									if (onFieldChange) onFieldChange('teamIds', val);
									if (clearFieldError) clearFieldError('teamIds');
								}}
								options={processedTeams.map((team) => ({ value: team.id, label: team.label }))}
								icon={Users}
								placeholder="Select Agents"
								error={!!formErrors.teamIds}
								errorMessage={formErrors.teamIds}
								maxDisplayCount={2}
							/>
						</div>
						{/* Project Files Upload */}
						<div className="md:col-span-1">
							<label className="block text-sm font-semibold text-gray-700 mb-2">Project Files</label>
							<input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} multiple />
							<div className="flex items-center gap-3">
								<div onClick={triggerFileInput} className="flex items-center justify-between w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 focus-within:ring-2 focus-within:ring-blue-500">
									<div className="flex items-center gap-2 text-gray-600">
										<Upload className="w-4 h-4" />
										{projectFiles && projectFiles.length > 0 ? (
											<span>{projectFiles.length} file(s) selected</span>
										) : (
											<span>Select project files</span>
										)}
									</div>
									<span className="text-blue-600 text-xs font-medium">Browse</span>
								</div>
							</div>
							{projectFiles && projectFiles.length > 0 && (
								<div className="mt-1 space-y-1">
									{projectFiles.map((file, index) => {
										const isExistingFile = file.isExisting || !(file instanceof File);
										return (
											<div key={`${file.name}-${index}`} className="flex items-center justify-between px-3 py-1 border border-gray-200 rounded-md text-sm bg-white gap-2">
												{isExistingFile && file.url ? (
													<a
														href={file.url}
														target="_blank"
														rel="noopener noreferrer"
														className="truncate text-xs max-w-[70%] text-blue-600 hover:underline"
														title="Click to view file"
													>
														{file.name}
													</a>
												) : (
													<span className="truncate text-xs max-w-[70%] text-gray-700">
														{file.name}
													</span>
												)}
												<div className="flex items-center gap-2">
													{isExistingFile && (
														<span className="text-green-600 text-xs font-medium whitespace-nowrap">Existing</span>
													)}
													{!isExistingFile && (
														<span className="text-orange-600 text-xs font-medium whitespace-nowrap">New</span>
													)}
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleRemoveFile(index);
														}}
														className="text-gray-400 hover:text-red-500 flex-shrink-0"
														title="Remove file"
													>
														<XCircle className="w-4 h-4" />
													</button>
												</div>
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
						onClick={() => onUpdate(editProject)}
						disabled={isSubmitting}
						className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
					>
						{isSubmitting ? (
							<>
								<svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
									<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
									<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
								</svg>
								Updating...
							</>
						) : "Update Project"}
					</button>
				</div>
			</div>
		</div>
	);
};

export default EditProjectModal;