import { useState, useCallback } from "react";
import { fetchUserDropdowns } from "../services/dropdownService";

export const useUserDropdowns = () => {
     const [dropdowns, setDropdowns] = useState({
          roles: [],
          designations: [],
          teams: [],
          projectManagers: [],
          assistantManagers: [],
          qas: [],
          agents: [],
          projectCategories: [],
     });

     const [loading, setLoading] = useState(false);
     const [error, setError] = useState(null);

     const loadDropdowns = useCallback(async () => {
          setLoading(true);
          setError(null);

          try {
               const data = await fetchUserDropdowns();

               console.log('[useUserDropdowns] Raw data received:', data);
               console.log('[useUserDropdowns] projectManagers:', data.projectManagers);
               console.log('[useUserDropdowns] assistantManagers:', data.assistantManagers);
               console.log('[useUserDropdowns] qas:', data.qas);
               console.log('[useUserDropdowns] agents:', data.agents);
               console.log('[useUserDropdowns] projectCategories:', data.projectCategories);

               // ✅ VALIDATION GUARD
               const isValid =
                    Array.isArray(data.roles) &&
                    Array.isArray(data.designations) &&
                    Array.isArray(data.teams) &&
                    Array.isArray(data.projectManagers) &&
                    Array.isArray(data.assistantManagers) &&
                    Array.isArray(data.qas) &&
                    Array.isArray(data.agents) &&
                    Array.isArray(data.projectCategories);

               if (!isValid) {
                    console.warn("⚠️ Invalid dropdown response:", data);
                    console.warn("Roles:", data.roles, "is array?", Array.isArray(data.roles));
                    console.warn("Designations:", data.designations, "is array?", Array.isArray(data.designations));
                    console.warn("Teams:", data.teams, "is array?", Array.isArray(data.teams));
                    console.warn("ProjectManagers:", data.projectManagers, "is array?", Array.isArray(data.projectManagers));
                    console.warn("AssistantManagers:", data.assistantManagers, "is array?", Array.isArray(data.assistantManagers));
                    console.warn("QAs:", data.qas, "is array?", Array.isArray(data.qas));
                    console.warn("Agents:", data.agents, "is array?", Array.isArray(data.agents));
                    setLoading(false);
                    return null;
               }

               setDropdowns(data);
               setLoading(false);
               return data;
          } catch (err) {
               console.error("❌ Dropdown fetch failed:", err);
               console.error("Error details:", err.response?.data || err.message);
               setError(err);
               setLoading(false);
               return null;
          }
     }, []);

     return {
          dropdowns,
          loading,
          error,
          loadDropdowns,
     };
};
