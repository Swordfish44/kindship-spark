import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { centsToDisplay } from '@/lib/currency';
import { toast } from 'sonner';

type DailyRow = {
  day: string;
  donations_count: number;
  gross_cents: number;
  refund_cents: number;
  stripe_fee_cents: number;
  platform_fee_cents: number;
  net_to_organizer_cents: number;
};

type CampaignRow = {
  campaign_id: string;
  title: string;
  slug: string;
  donations_count: number;
  gross_cents: number;
  refund_cents: number;
  stripe_fee_cents: number;
  platform_fee_cents: number;
  net_to_organizer_cents: number;
};

type PayoutRow = {
  id: string;
  organizer_id: string;
  stripe_account_id: string;
  stripe_payout_id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
};

export default function AdminFinance() {
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [byCampaign, setByCampaign] = useState<CampaignRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const sDate = start || null;
      const eDate = end || null;

      const [dRes, cRes, pRes] = await Promise.all([
        supabase.rpc('admin_ledger_daily', { p_start: sDate, p_end: eDate }),
        supabase.rpc('admin_ledger_by_campaign'),
        supabase.rpc('admin_payouts')
      ]);

      if (dRes.error) throw dRes.error;
      if (cRes.error) throw cRes.error;
      if (pRes.error) throw pRes.error;

      setDaily(dRes.data || []);
      setByCampaign(cRes.data || []);
      setPayouts(pRes.data || []);
    } catch (error: any) {
      toast.error(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totals = useMemo(() => {
    return daily.reduce((acc, r) => ({
      gross: acc.gross + (r.gross_cents || 0),
      refunds: acc.refunds + (r.refund_cents || 0),
      stripe: acc.stripe + (r.stripe_fee_cents || 0),
      platform: acc.platform + (r.platform_fee_cents || 0),
      net: acc.net + (r.net_to_organizer_cents || 0),
      count: acc.count + (r.donations_count || 0)
    }), { gross: 0, refunds: 0, stripe: 0, platform: 0, net: 0, count: 0 });
  }, [daily]);

  async function exportCsv() {
    try {
      const baseUrl = 'https://uobgytlnzmngwxmweufu.functions.supabase.co/ledger-export';
      const url = new URL(baseUrl);
      if (start) url.searchParams.set('start', start);
      if (end) url.searchParams.set('end', end);
      window.open(url.toString(), '_blank');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  }

  async function backfillFees() {
    try {
      setBusy(true);
      const since = start || new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
      const { data, error } = await supabase.functions.invoke('sync-ledger', { 
        body: { since, limit: 200 } 
      });
      
      if (error) throw error;
      
      toast.success(`Fee backfill updated: ${data?.updated || 0} records`);
      await load();
    } catch (error: any) {
      toast.error(`Backfill failed: ${error.message}`);
    } finally {
      setBusy(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      paid: 'default',
      pending: 'secondary',
      in_transit: 'outline',
      failed: 'destructive'
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Finance Dashboard</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Finance Dashboard</h1>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2">
              <Label htmlFor="start">Start Date</Label>
              <Input
                id="start"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End Date</Label>
              <Input
                id="end"
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <Button onClick={load}>Filter</Button>
            <Button variant="outline" onClick={exportCsv}>
              Export CSV
            </Button>
            <Button variant="secondary" onClick={backfillFees} disabled={busy}>
              {busy ? 'Backfilling...' : 'Run Fee Backfill'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gross Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centsToDisplay(totals.gross)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stripe Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centsToDisplay(totals.stripe)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centsToDisplay(totals.platform)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centsToDisplay(totals.refunds)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net to Organizers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{centsToDisplay(totals.net)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Donations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.count.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Ledger */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">#</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Refunds</TableHead>
                <TableHead className="text-right">Stripe Fee</TableHead>
                <TableHead className="text-right">Platform Fee</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daily.length > 0 ? (
                daily.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{new Date(row.day).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{row.donations_count}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.gross_cents)}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.refund_cents)}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.stripe_fee_cents)}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.platform_fee_cents)}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.net_to_organizer_cents)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">No data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* By Campaign */}
      <Card>
        <CardHeader>
          <CardTitle>By Campaign</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">#</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Refunds</TableHead>
                <TableHead className="text-right">Stripe Fee</TableHead>
                <TableHead className="text-right">Platform Fee</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCampaign.length > 0 ? (
                byCampaign.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell className="text-muted-foreground">{row.slug}</TableCell>
                    <TableCell className="text-right">{row.donations_count}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.gross_cents)}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.refund_cents)}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.stripe_fee_cents)}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.platform_fee_cents)}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.net_to_organizer_cents)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">No data available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payouts */}
      <Card>
        <CardHeader>
          <CardTitle>Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Payout ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.length > 0 ? (
                payouts.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{centsToDisplay(row.amount_cents)}</TableCell>
                    <TableCell className="uppercase">{row.currency}</TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="font-mono text-sm">{row.stripe_account_id}</TableCell>
                    <TableCell className="font-mono text-sm">{row.stripe_payout_id}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No payouts available</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}