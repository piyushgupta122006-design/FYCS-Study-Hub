import { Plus, Loader2, Code, Pencil, Trash2, Book } from "lucide-react";
import CustomSelect from "./CustomSelect";

export default function AdminSubjects({
  newSubject, setNewSubject, semesters,
  showAddSubjectForm, setShowAddSubjectForm,
  handlePdfAiAutomation, isAiProcessing,
  aiExtractedSubjects, setAiExtractedSubjects,
  handleBulkAddAiSubjects, handleAddSubject,
  getSubjectsBySemester,
  handleEditSubjectClick, CREATOR_EMAILS, user, deleteSubject,
  handleTouchStart, handleTouchEnd, handleSubjectItemClick,
  selectedSubjects, isMultiSelectMode
}) {
  return (
    <>
      <div className="glass-card p-5 mb-6 border border-purple-500/10 bg-purple-500/5 rounded-2xl">
        <div className="max-w-xs mx-auto text-center mb-4">
          <label className="block text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">
            🎯 Step 1: Select Target Semester First
          </label>
          <CustomSelect
            value={newSubject.semesterId}
            onChange={(val) => {
              setNewSubject(prev => ({ ...prev, semesterId: val }));
              setAiExtractedSubjects([]);
            }}
            placeholder="Select Semester"
            options={(semesters || []).map(sem => ({ value: sem.id, label: sem.name }))}
          />
        </div>

        <div className="w-full h-px bg-white/5 my-4" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setShowAddSubjectForm(!showAddSubjectForm)}
            className="glass-card border border-white/10 p-5 flex flex-col items-center justify-center gap-2 rounded-xl hover:bg-white/5 transition-all text-center"
          >
            <Plus size={18} className="text-white/50" />
            <span className="font-bold text-white/70 text-xs">Add Single Subject (Manual)</span>
            <span className="text-[10px] text-white/40">Type manually for Semester {newSubject.semesterId}</span>
          </button>

          <label className={`glass-card border border-dashed p-5 flex flex-col items-center justify-center gap-2 rounded-xl transition-all text-center group ${
            isAiProcessing
              ? 'border-zinc-700 bg-zinc-900/20 cursor-not-allowed opacity-50'
              : 'border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer'
          }`}>
            <input
              type="file"
              accept=".pdf"
              onChange={handlePdfAiAutomation}
              disabled={isAiProcessing}
              className="sr-only"
            />
            {isAiProcessing ? (
              <Loader2 size={18} className="text-purple-400 animate-spin" />
            ) : (
              <Code size={18} className="text-purple-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="font-bold text-purple-300 text-xs">AI Syllabus Parser (PDF)</span>
            <span className="text-[10px] text-purple-200/50">Auto-extract items for Semester {newSubject.semesterId}</span>
          </label>
        </div>
      </div>

      {showAddSubjectForm && (
        <div className="glass-card p-6 mb-6 border border-white/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <h3 className="font-bold text-sm mb-4 text-white/90">Add Subject Manually to Semester {newSubject.semesterId}</h3>
          <form onSubmit={handleAddSubject} className="space-y-4">
            <div>
              <label className="block text-white/50 text-xs mb-2">Subject Name</label>
              <input
                type="text"
                value={newSubject.name}
                onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                className="w-full glass-card p-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-white/30 focus:border-[#FFD700] focus:outline-none text-sm"
                placeholder="e.g. OS - Principles of Operating Systems"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 btn-primary py-2.5 text-xs font-bold">Save Subject</button>
              <button
                type="button"
                onClick={() => setShowAddSubjectForm(false)}
                className="flex-1 glass-card py-2.5 text-center font-bold rounded-xl border border-white/10 text-white/70 hover:bg-white/5 text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {aiExtractedSubjects.length > 0 && (
        <div className="glass-card p-5 mb-6 border border-[#FFD700]/20 bg-[#FFD700]/5 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 mb-4 gap-2">
            <div>
              <h4 className="font-bold text-white text-sm">🤖 AI Structure Preview (Semester {newSubject.semesterId})</h4>
              <p className="text-[11px] text-white/40">Review clean names before synchronizing database streams</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto mb-4 p-2 bg-black/40 rounded-xl custom-scrollbar">
            {aiExtractedSubjects.map((sub, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between px-3 py-2 border rounded-lg text-xs font-medium transition-all ${
                  sub.exists
                    ? 'bg-rose-500/5 border-rose-500/10 text-rose-300 opacity-60 line-through'
                    : 'bg-white/5 border-white/5 text-zinc-300'
                }`}
              >
                <span className="truncate pr-2">
                  {sub.exists ? '⚠️' : '✨'} {sub.name}
                </span>
                {sub.exists && (
                  <span className="text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wide flex-shrink-0">
                    Exists
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleBulkAddAiSubjects}
              disabled={aiExtractedSubjects.filter(s => !s.exists).length === 0}
              className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all ${
                aiExtractedSubjects.filter(s => !s.exists).length === 0
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50 shadow-none'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-900/20'
              }`}
            >
              🚀 Push {aiExtractedSubjects.filter(s => !s.exists).length} Unique Subjects to Sem {newSubject.semesterId}
            </button>
            <button
              onClick={() => setAiExtractedSubjects([])}
              className="px-4 py-2.5 bg-white/5 border border-white/10 text-white/60 hover:text-white rounded-xl font-bold text-xs transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {(semesters || []).map(semester => {
          const semSubjects = getSubjectsBySemester?.(semester.id) || [];
          if (semSubjects.length === 0) return null;

          return (
            <div key={semester.id} className="glass-card p-4 md:p-5">
              <h3 className="font-bold text-base md:text-lg mb-3 md:mb-4 text-white/90 border-b border-white/10 pb-2">
                {semester.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                {(semSubjects || []).map(subject => {
                  const isItemSelected = selectedSubjects.includes(subject.id);

                  return (
                    <div
                      key={subject.id}
                      onTouchStart={() => handleTouchStart(subject.id)}
                      onTouchEnd={handleTouchEnd}
                      onClick={() => handleSubjectItemClick(subject.id)}
                      style={{ transform: 'translateZ(0)', willChange: 'transform' }}
                      className={`glass-card p-4 flex items-center justify-between transition-all duration-200 relative select-none transform active:scale-98 ${
                        isItemSelected
                          ? 'border-[#FFD700] bg-[#FFD700]/10'
                          : 'bg-white/2 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isMultiSelectMode && (
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0 ${
                            isItemSelected ? 'bg-[#FFD700] border-[#FFD700]' : 'border-white/30'
                          }`}>
                            {isItemSelected && <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        )}
                        <div className="font-semibold text-xs sm:text-sm text-white/90 truncate">{subject.name}</div>
                      </div>

                      {!isMultiSelectMode && (
                        <div className="flex gap-2 relative z-10">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleEditSubjectClick(subject); }}
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                          {CREATOR_EMAILS.includes(user?.email) && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); deleteSubject(subject.id); }}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {(!semesters || semesters.length === 0) && (
          <div className="glass-card p-8 text-center">
            <Book size={32} className="mx-auto mb-3 text-white/30" />
            <div className="font-semibold text-white mb-1">No semesters found</div>
            <div className="text-sm text-white/40">Add semesters to manage subjects</div>
          </div>
        )}
      </div>
    </>
  );
}
