'use client';

import { Settings, User, Shield, Bell, Zap, Database, Key } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export default function SetariPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Setări</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Gestionați setările cabinetului, profilul și integrările cu serviciile externe.
        </p>
      </div>

      <Tabs defaultValue="general" className="flex flex-col md:flex-row gap-6">
        <TabsList className="flex h-auto w-full flex-col justify-start gap-1 bg-transparent p-0 md:w-64">
          <TabsTrigger value="general" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <Settings className="mr-2 h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="profil" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <User className="mr-2 h-4 w-4" /> Profil
          </TabsTrigger>
          <TabsTrigger value="notificari" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <Bell className="mr-2 h-4 w-4" /> Notificări
          </TabsTrigger>
          <TabsTrigger value="integrari" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <Zap className="mr-2 h-4 w-4" /> Integrări API
          </TabsTrigger>
          <TabsTrigger value="securitate" className="justify-start px-4 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 data-[state=active]:shadow-none dark:data-[state=active]:bg-indigo-900/30 dark:data-[state=active]:text-indigo-400">
            <Shield className="mr-2 h-4 w-4" /> Securitate
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          <TabsContent value="general" className="m-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informații Cabinet</CardTitle>
                <CardDescription>Datele oficiale ale cabinetului de avocatură.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nume_cabinet">Nume Cabinet</Label>
                    <Input id="nume_cabinet" defaultValue="Cabinet Avocat Ludmila Trofim" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cui">Cod Fiscal / CUI</Label>
                    <Input id="cui" defaultValue="1012345678901" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="adresa_sediu">Adresă Sediu</Label>
                    <Input id="adresa_sediu" defaultValue="mun. Chișinău, str. București 1" />
                  </div>
                </div>
                <Button className="mt-4">Salvează Modificările</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrari" className="m-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Chei API & Servicii</CardTitle>
                <CardDescription>Configurați conexiunile cu serviciile de inteligență artificială.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold text-slate-900 dark:text-white">Anthropic (Claude)</Label>
                      <p className="text-sm text-slate-500">Folosit pentru redactare de documente și asistent juridic.</p>
                    </div>
                    <Badge className="bg-emerald-500">Conectat</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-slate-400" />
                    <Input type="password" value="sk-ant-api03-xxxxxxxxxxxxxxx" readOnly className="font-mono text-slate-500 bg-slate-50 dark:bg-slate-900" />
                    <Button variant="outline">Editează</Button>
                  </div>
                </div>
                
                <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold text-slate-900 dark:text-white">Google Gemini</Label>
                      <p className="text-sm text-slate-500">Folosit pentru OCR rapid și extragere de date din poze.</p>
                    </div>
                    <Badge variant="secondary">Neconfigurat</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-slate-400" />
                    <Input type="password" placeholder="Introduceți cheia API Google AI Studio" className="font-mono" />
                    <Button>Conectează</Button>
                  </div>
                </div>
                
                <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-semibold text-slate-900 dark:text-white">OpenAI (Whisper)</Label>
                      <p className="text-sm text-slate-500">Folosit pentru transcrierea audio a consultațiilor.</p>
                    </div>
                    <Badge variant="secondary">Neconfigurat</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-slate-400" />
                    <Input type="password" placeholder="Introduceți cheia API OpenAI" className="font-mono" />
                    <Button>Conectează</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Canale de comunicare</CardTitle>
                <CardDescription>Conectați Telegram sau WhatsApp pentru preluare mesaje.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-base">Bot Telegram</Label>
                    <p className="text-sm text-slate-500">Sincronizați mesajele clienților în aplicație.</p>
                  </div>
                  <Switch checked={true} />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-base">Integrare Email (IMAP)</Label>
                    <p className="text-sm text-slate-500">Sincronizați adresa @justice.md</p>
                  </div>
                  <Switch checked={true} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
