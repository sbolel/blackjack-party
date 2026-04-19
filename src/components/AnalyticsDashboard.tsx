import { useKV } from '@github/spark/hooks'
import { BetHistoryEntry, PlayerStatistics } from '@/lib/types'
import { calculatePlayerStatistics, getRecentHistory, aggregateStatsByDay } from '@/lib/analytics'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  TrendUp, 
  TrendDown, 
  Trophy, 
  Target, 
  Coins, 
  ChartLine,
  Fire,
  Clock,
  X
} from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface AnalyticsDashboardProps {
  currentPlayerId: string
  onClose: () => void
}

export function AnalyticsDashboard({ currentPlayerId, onClose }: AnalyticsDashboardProps) {
  const [betHistory] = useKV<BetHistoryEntry[]>('bet-history', [])
  
  const history = betHistory || []
  const stats = calculatePlayerStatistics(history, currentPlayerId)
  const recentBets = getRecentHistory(history.filter(b => b.playerId === currentPlayerId), 20)
  const dailyStats = aggregateStatsByDay(history.filter(b => b.playerId === currentPlayerId))

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <ChartLine size={48} className="mx-auto text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">No Betting History</h2>
          <p className="text-muted-foreground mb-6">
            Start playing to see your statistics and analytics!
          </p>
          <Button onClick={onClose} className="w-full">
            Back to Game
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Analytics Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              {stats.playerName}'s Performance Statistics
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            <X size={18} weight="bold" className="mr-2" />
            Close
          </Button>
        </div>
      </div>

      <div className="container mx-auto p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={<Coins size={24} className="text-gold" weight="bold" />}
                label="Net Profit"
                value={stats.netProfit}
                isCurrency
                trend={stats.netProfit >= 0 ? 'up' : 'down'}
                className={stats.netProfit >= 0 ? 'border-gold/30' : 'border-destructive/30'}
              />
              <StatCard
                icon={<Target size={24} className="text-primary" weight="bold" />}
                label="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                subtitle={`${stats.wins}W / ${stats.losses}L / ${stats.pushes}P`}
              />
              <StatCard
                icon={<Trophy size={24} className="text-accent" weight="bold" />}
                label="Blackjacks"
                value={stats.blackjacks}
                subtitle={`${((stats.blackjacks / stats.totalBets) * 100).toFixed(1)}% of hands`}
              />
              <StatCard
                icon={<Fire size={24} className="text-destructive" weight="bold" />}
                label="Current Streak"
                value={Math.abs(stats.currentStreak)}
                subtitle={stats.currentStreak >= 0 ? 'Wins' : 'Losses'}
                trend={stats.currentStreak >= 0 ? 'up' : 'down'}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <Card className="p-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Betting Stats
                </h3>
                <div className="space-y-3">
                  <StatRow label="Total Bets" value={stats.totalBets} />
                  <StatRow label="Total Wagered" value={stats.totalWagered} isCurrency />
                  <StatRow label="Average Bet" value={stats.averageBet.toFixed(0)} isCurrency />
                  <StatRow label="Total Won" value={stats.totalWon} isCurrency className="text-primary" />
                  <StatRow label="Total Lost" value={stats.totalLost} isCurrency className="text-destructive" />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Records
                </h3>
                <div className="space-y-3">
                  <StatRow 
                    label="Biggest Win" 
                    value={stats.biggestWin} 
                    isCurrency 
                    className="text-gold" 
                  />
                  <StatRow 
                    label="Biggest Loss" 
                    value={Math.abs(stats.biggestLoss)} 
                    isCurrency 
                    className="text-destructive" 
                  />
                  <StatRow label="Longest Win Streak" value={stats.longestWinStreak} />
                  <StatRow label="Longest Loss Streak" value={stats.longestLossStreak} />
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                  Activity
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">First Bet</p>
                    <p className="text-sm font-mono">
                      {new Date(stats.firstBet).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Last Bet</p>
                    <p className="text-sm font-mono">
                      {new Date(stats.lastBet).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Time Playing</p>
                    <p className="text-sm font-mono">
                      {Math.ceil((stats.lastBet - stats.firstBet) / (1000 * 60 * 60 * 24))} days
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Distribution</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="h-32 flex items-end justify-center mb-2">
                    <div 
                      className="w-full bg-primary rounded-t-lg transition-all"
                      style={{ height: `${(stats.wins / stats.totalBets) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold">{stats.wins}</p>
                  <p className="text-xs text-muted-foreground">Wins</p>
                </div>
                <div className="text-center">
                  <div className="h-32 flex items-end justify-center mb-2">
                    <div 
                      className="w-full bg-destructive rounded-t-lg transition-all"
                      style={{ height: `${(stats.losses / stats.totalBets) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold">{stats.losses}</p>
                  <p className="text-xs text-muted-foreground">Losses</p>
                </div>
                <div className="text-center">
                  <div className="h-32 flex items-end justify-center mb-2">
                    <div 
                      className="w-full bg-muted rounded-t-lg transition-all"
                      style={{ height: `${(stats.pushes / stats.totalBets) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold">{stats.pushes}</p>
                  <p className="text-xs text-muted-foreground">Pushes</p>
                </div>
                <div className="text-center">
                  <div className="h-32 flex items-end justify-center mb-2">
                    <div 
                      className="w-full bg-gold rounded-t-lg transition-all"
                      style={{ height: `${(stats.blackjacks / stats.totalBets) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm font-semibold">{stats.blackjacks}</p>
                  <p className="text-xs text-muted-foreground">Blackjacks</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock size={20} weight="bold" />
                Recent Bets ({recentBets.length})
              </h3>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-2">
                  {recentBets.map((bet) => (
                    <div
                      key={bet.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={
                              bet.result === 'won' || bet.result === 'blackjack' 
                                ? 'default' 
                                : bet.result === 'lost' 
                                  ? 'destructive' 
                                  : 'secondary'
                            }
                            className="uppercase text-xs"
                          >
                            {bet.result}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            Round {bet.roundNumber}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-mono">
                            Bet: {bet.betAmount} chips
                          </span>
                          <span className="text-muted-foreground">
                            {bet.playerHandValue} vs {bet.dealerHandValue}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-lg font-bold font-mono",
                          bet.profit > 0 && "text-gold",
                          bet.profit < 0 && "text-destructive"
                        )}>
                          {bet.profit > 0 ? '+' : ''}{bet.profit}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(bet.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <ChartLine size={20} weight="bold" />
                Daily Performance
              </h3>
              {dailyStats.length > 0 ? (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {dailyStats.map((day) => (
                      <div
                        key={day.date}
                        className="p-4 rounded-lg border border-border bg-card/50"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">{day.date}</h4>
                          <Badge 
                            variant={day.netProfit >= 0 ? 'default' : 'destructive'}
                            className="font-mono"
                          >
                            {day.netProfit > 0 ? '+' : ''}{day.netProfit}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Bets</p>
                            <p className="font-semibold">{day.totalBets}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Wagered</p>
                            <p className="font-semibold font-mono">{day.totalWagered}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Wins</p>
                            <p className="font-semibold text-primary">{day.wins}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Losses</p>
                            <p className="font-semibold text-destructive">{day.losses}</p>
                          </div>
                        </div>
                        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden flex">
                          {day.wins > 0 && (
                            <div 
                              className="bg-primary"
                              style={{ width: `${(day.wins / day.totalBets) * 100}%` }}
                            />
                          )}
                          {day.losses > 0 && (
                            <div 
                              className="bg-destructive"
                              style={{ width: `${(day.losses / day.totalBets) * 100}%` }}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ChartLine size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No trend data available yet</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
  subtitle?: string
  trend?: 'up' | 'down'
  isCurrency?: boolean
  className?: string
}

function StatCard({ icon, label, value, subtitle, trend, isCurrency, className }: StatCardProps) {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-muted">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "p-1 rounded-full",
            trend === 'up' ? "text-primary" : "text-destructive"
          )}>
            {trend === 'up' ? <TrendUp size={20} weight="bold" /> : <TrendDown size={20} weight="bold" />}
          </div>
        )}
      </div>
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </h3>
      <p className="text-2xl font-bold font-mono">
        {isCurrency && typeof value === 'number' && (value > 0 ? '+' : '')}
        {isCurrency && typeof value === 'number' ? value : value}
        {isCurrency && typeof value === 'number' && ' chips'}
      </p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </Card>
  )
}

interface StatRowProps {
  label: string
  value: number | string
  isCurrency?: boolean
  className?: string
}

function StatRow({ label, value, isCurrency, className }: StatRowProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold font-mono", className)}>
        {isCurrency && typeof value === 'number' ? `${value} chips` : value}
      </span>
    </div>
  )
}
