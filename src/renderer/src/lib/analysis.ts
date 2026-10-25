import { analyzeFailover, analyzePower, type FailoverScenario, type PowerAnalysis } from '../model/power'
import type { Project } from '../model/types'
import { validate, type Issue } from '../model/validation'
import { useStore } from '../store'

export interface Analysis {
  power: PowerAnalysis
  failover: FailoverScenario[]
  issues: Issue[]
}

let cache: { project: Project; analysis: Analysis } | null = null

export function getAnalysis(project: Project): Analysis {
  if (cache?.project === project) return cache.analysis
  const power = analyzePower(project)
  const analysis = { power, failover: analyzeFailover(project, power), issues: validate(project, power) }
  cache = { project, analysis }
  return analysis
}

export function useAnalysis(): Analysis {
  return getAnalysis(useStore((s) => s.project))
}
