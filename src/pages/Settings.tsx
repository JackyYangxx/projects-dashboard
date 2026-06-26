import LLMConfigPanel from '@/components/LLMConfigPanel'
import MCPConfigPanel from '@/components/MCPConfigPanel'
import SkillPanel from '@/components/SkillPanel'

export default function Settings() {
  return (
    <div className="min-h-screen bg-surface-base">
      <nav className="h-14 bg-surface-elevated border-b border-outline flex items-center px-6 gap-4 sticky top-0 z-10">
        <h1 className="text-base font-heading font-semibold text-on-surface-primary">设置</h1>
      </nav>
      <main className="max-w-[1200px] mx-auto p-6 pb-20 space-y-6">
        <LLMConfigPanel />
        <MCPConfigPanel />
        <SkillPanel />
      </main>
    </div>
  )
}
