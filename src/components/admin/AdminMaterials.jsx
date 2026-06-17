import { FileText, Code, Star, Edit3, Eye, Pencil, CheckCircle, XCircle, Download, Clock, Search, Trash2 } from "lucide-react";
import CustomSelect from "./CustomSelect";

export default function AdminMaterials({
  materialFilter, setMaterialFilter,
  getPendingMaterials, getApprovedMaterials,
  searchQuery, setSearchQuery,
  filterSem, setFilterSem,
  filterType, setFilterType,
  filterSubject, setFilterSubject,
  sortOrder, setSortOrder,
  semesters, filteredSubjectsForDropdown,
  selectedPending, toggleAllPending, togglePendingSelection,
  handleEditClick, approveMaterial,
  setItemToReject,
  filteredMaterials, visibleMaterialsCount, lastMaterialRef,
  selectedMaterials, handleMatTouchStart, handleMatTouchEnd, handleMaterialItemClick,
  isMaterialMultiMode,
  CREATOR_EMAILS, user, setItemToDelete,
  getSemesterById, getSubjectById, materials
}) {
  return (
    <>
      <div className="glass-card p-4 mb-6 overflow-visible relative z-[100]">
        <div className="flex flex-wrap gap-3 mb-4">
          <button
            type="button"
            onClick={() => setMaterialFilter("Pending")}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              materialFilter === "Pending"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            Pending ({getPendingMaterials().length})
          </button>
          <button
            type="button"
            onClick={() => setMaterialFilter("Approved")}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
              materialFilter === "Approved"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            Approved ({getApprovedMaterials().length})
          </button>
        </div>

        {materialFilter === "Approved" && (
          <div className="space-y-4 mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-white/50" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title..."
                className="w-full glass-card pl-10 pr-4 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-[50]">
              <CustomSelect
                value={filterSem}
                onChange={setFilterSem}
                placeholder="All Semesters"
                options={[
                  { value: "All", label: "All Semesters" },
                  ...(semesters || []).map(sem => ({ value: sem.id, label: sem.name }))
                ]}
              />

              <CustomSelect
                value={filterType}
                onChange={setFilterType}
                placeholder="All Types"
                options={[
                  { value: "All", label: "All Types" },
                  { value: "Notes", label: "Notes" },
                  { value: "Practicals", label: "Practicals" },
                  { value: "IMP", label: "IMP" },
                  { value: "Assignment", label: "Assignment" }
                ]}
              />

              <CustomSelect
                value={filterSubject}
                onChange={setFilterSubject}
                placeholder="All Subjects"
                options={[
                  { value: "All", label: "All Subjects" },
                  ...(filteredSubjectsForDropdown || []).map(sub => ({ value: sub.id, label: sub.name }))
                ]}
              />

              <CustomSelect
                value={sortOrder}
                onChange={setSortOrder}
                placeholder="Sort Order"
                options={[
                  { value: "newest", label: "Newest First" },
                  { value: "oldest", label: "Oldest First" },
                  { value: "az", label: "Title A-Z" }
                ]}
              />
            </div>
          </div>
        )}
      </div>

      <div className="relative space-y-4" style={{ position: 'relative', zIndex: 1 }}>
        {materialFilter === "Pending" && getPendingMaterials().length > 0 && (
          <div className="glass-card p-3 mb-4 flex items-center justify-between bg-white/5 border border-white/10 rounded-xl">
             <label className="flex items-center gap-3 cursor-pointer group px-2 w-full">
                <input type="checkbox" checked={selectedPending.length === getPendingMaterials().length} onChange={toggleAllPending} className="sr-only" />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedPending.length === getPendingMaterials().length ? 'bg-[#FFD700] border-[#FFD700]' : 'border-white/20 group-hover:border-white/40'}`}>
                  {selectedPending.length === getPendingMaterials().length && (
                    <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
                <span className="text-sm font-bold text-white/70 group-hover:text-white transition-colors">Select All Pending</span>
             </label>
             <span className="text-xs text-white/40 font-medium px-2 whitespace-nowrap">{getPendingMaterials().length} Total</span>
          </div>
        )}

        {materialFilter === "Pending"
          ? getPendingMaterials().map((material) => {
              const semester = getSemesterById(material.semId);
              const subject = getSubjectById(material.subjectId);
              const isSelected = selectedPending.includes(material.id);

              return (
                <div key={material.id} className={`glass-card p-5 rounded-2xl relative transition-all duration-300 ${isSelected ? 'border-[#FFD700]/50 bg-[#FFD700]/5 shadow-[0_0_15px_rgba(255,215,0,0.05)]' : 'hover:border-white/20'}`}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">

                    <div className="flex-1 flex gap-4 items-start">

                      <label className="relative flex items-center justify-center cursor-pointer pt-1 pl-1 group">
                        <input type="checkbox" checked={isSelected} onChange={() => togglePendingSelection(material.id)} className="sr-only" />
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-[#FFD700] border-[#FFD700]' : 'border-white/20 group-hover:border-[#FFD700]/50'}`}>
                          {isSelected && (
                            <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          )}
                        </div>
                      </label>

                      <div className="w-full">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {material.type === 'Notes' ? <FileText className="text-blue-400" size={18} /> :
                             material.type === 'Practicals' ? <Code className="text-green-400" size={18} /> :
                             material.type === 'IMP' ? <Star className="text-yellow-400" size={18} /> :
                             material.type === 'Assignment' ? <Edit3 className="text-purple-400" size={18} /> :
                             <FileText className="text-amber-400" size={18} />}
                          </div>
                          <div>
                            <h3 className="font-bold text-white/90">{material.title}</h3>
                            <div className="text-sm text-white/50 mt-1">
                              {semester?.name} • {subject?.name} • {material.type}
                            </div>
                            <div className="text-xs text-white/40 mt-2">
                              Uploaded by {material.uploadedBy?.split(' ')[0] || 'Admin'} • {material.date ? new Date(typeof material.date === 'object' && material.date.toDate ? material.date.toDate() : material.date).toLocaleDateString() : 'Just now'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:pl-10">
                      <a href={material.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors">
                        <Eye size={14} /> View
                      </a>
                      <button type="button" onClick={() => handleEditClick(material)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 text-xs font-bold hover:bg-white/10 hover:text-white transition-colors">
                        <Pencil size={14} /> Edit
                      </button>
                      <button type="button" onClick={() => approveMaterial(material.id)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors">
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button type="button" onClick={() => setItemToReject(material.id)} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20 transition-colors">
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          : filteredMaterials.slice(0, visibleMaterialsCount).map((material, index) => {
              const isLastItem = index === Math.min(visibleMaterialsCount, filteredMaterials.length) - 1;
              const ref = isLastItem ? lastMaterialRef : null;
              const semester = getSemesterById(material.semId);
              const subject = getSubjectById(material.subjectId);
              const isMatSelected = selectedMaterials.includes(material.id);

              return (
                <div
                  key={material.id}
                  ref={ref}
                  onTouchStart={() => handleMatTouchStart(material.id)}
                  onTouchEnd={handleMatTouchEnd}
                  onClick={(e) => handleMaterialItemClick(material, e)}
                  style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                  className={`glass-card p-5 rounded-2xl hover:border-white/20 transition-all duration-300 group select-none ${
                    isMatSelected ? 'border-[#FFD700] bg-[#FFD700]/10 scale-[0.99]' : ''
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">

                    <div className="flex-1 flex items-start gap-4 min-w-0">
                      {isMaterialMultiMode && (
                        <div className={`w-5 h-5 rounded-lg mt-3 flex items-center justify-center border transition-all flex-shrink-0 ${
                          isMatSelected ? 'bg-[#FFD700] border-[#FFD700]' : 'border-white/20'
                        }`}>
                          {isMatSelected && <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-2xl flex-shrink-0 ${
                            material.type === 'Notes' ? 'bg-blue-500/10 text-blue-400' :
                            material.type === 'Practicals' ? 'bg-green-500/10 text-green-400' :
                            material.type === 'IMP' ? 'bg-yellow-500/10 text-yellow-400' :
                            material.type === 'Assignment' ? 'bg-purple-500/10 text-purple-400' :
                            'bg-emerald-500/10 text-emerald-400'
                          }`}>
                            {material.type === 'Notes' ? <FileText size={24} /> :
                             material.type === 'Practicals' ? <Code size={24} /> :
                             material.type === 'IMP' ? <Star size={24} /> :
                             material.type === 'Assignment' ? <Edit3 size={24} /> :
                             <FileText size={24} />}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-white text-base group-hover:text-[#FFD700] transition-colors truncate">{material.title}</h3>

                            <div className="flex items-center flex-wrap gap-2 text-[11px] font-bold text-white/50 mt-2 uppercase tracking-wider">
                              <span className="bg-white/5 border border-white/5 px-2 py-1 rounded-lg">{semester?.name}</span>
                              <span className="bg-white/5 border border-white/5 px-2 py-1 rounded-lg">{subject?.name}</span>
                              <span className="bg-white/5 border border-white/5 px-2 py-1 rounded-lg text-white/70">{material.type}</span>
                            </div>

                            <div className="flex items-center flex-wrap gap-4 mt-3 text-xs text-white/40 font-medium">
                              <span className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md"><Eye size={14} /> {material.views || 0} views</span>
                              <span className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md"><Download size={14} /> {material.downloads || 0} dls</span>
                              <span className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-md"><Clock size={14} /> {material.date ? new Date(typeof material.date === 'object' && material.date.toDate ? material.date.toDate() : material.date).toLocaleDateString() : 'Just now'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {!isMaterialMultiMode && (
                      <div className="flex items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0 relative z-10">
                        <a href={material.link} target="_blank" rel="noopener noreferrer" className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 font-bold hover:bg-blue-500/20 transition-all text-sm">View</a>
                        <button type="button" onClick={() => handleEditClick(material)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold hover:bg-emerald-500/20 transition-all text-sm">Edit</button>
                        {CREATOR_EMAILS.includes(user?.email) && (
                          <button type="button" onClick={() => setItemToDelete(material.id)} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold hover:bg-rose-500/20 transition-all text-sm">Delete</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

        {materialFilter === "Approved" && visibleMaterialsCount < filteredMaterials.length && (
          <div ref={lastMaterialRef} className="w-full py-6 flex justify-center items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
            <span className="ml-3 text-zinc-400 text-sm">Loading more...</span>
          </div>
        )}

        {materialFilter === "Approved" && filteredMaterials.length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="text-white/50 mb-2">No matching materials found</div>
            <div className="text-sm text-white/40">Try adjusting your search, filter, or sort options</div>
          </div>
        )}

        {materialFilter === "Pending" && materials.filter(m => m.status === materialFilter).length === 0 && (
          <div className="glass-card p-12 text-center">
            <div className="text-white/50 mb-2">No pending materials found</div>
            <div className="text-sm text-white/40">All materials are approved!</div>
          </div>
        )}
      </div>
    </>
  );
}
