import { useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router';
import { BookOpenText, ChevronRight, Code2, GraduationCap, Loader2, Pencil, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { educationService, EDUCATION_MOCK_MODE } from '../../services';
import type { EducationTopic } from '../data/educationContent';
import { DocsLayout } from '../components/education/DocsLayout';
import { MarkdownRenderer, renderInlineMarkdown } from '../components/education/MarkdownRenderer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';

interface SubtopicDraft {
  title: string;
  summary: string;
  content: string;
}

export default function Education() {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [topics, setTopics] = useState<EducationTopic[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SubtopicDraft>({ title: '', summary: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // A qué subtema pertenece el draft. Guardar usa SIEMPRE estos ids, nunca la
  // selección actual: si la URL cambió (back/forward), no se escribe el draft
  // de un subtema sobre otro.
  const editingFor = useRef<{ topicId: string; subtopicId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    educationService
      .getContent(user?.email)
      .then((data) => {
        if (cancelled) return;
        setTopics(data.topics);
        setCanEdit(data.can_edit);
      })
      .catch(() => {
        if (!cancelled) setLoadError('No se pudo cargar el contenido. Intenta de nuevo más tarde.');
      });

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  // La selección se deriva de la URL (/education/:slug, donde slug es el id del
  // subtema, único global). Sin slug o con slug desconocido cae al primer tema.
  const { activeTopic, activeSubtopic } = useMemo(() => {
    if (!topics || topics.length === 0) {
      return { activeTopic: null, activeSubtopic: null };
    }
    if (slug) {
      for (const topic of topics) {
        const subtopic = topic.subtopics.find((s) => s.id === slug);
        if (subtopic) return { activeTopic: topic, activeSubtopic: subtopic };
      }
    }
    const first = topics[0];
    return { activeTopic: first, activeSubtopic: first.subtopics[0] ?? null };
  }, [topics, slug]);

  const draftIsDirty =
    editing &&
    activeSubtopic !== null &&
    (draft.title !== activeSubtopic.title ||
      draft.summary !== activeSubtopic.summary ||
      draft.content !== activeSubtopic.content);

  const activeSubtopicId = activeSubtopic?.id ?? null;

  // Guard central de navegación: con draft sucio, CUALQUIER cambio de ruta
  // (sidebar, select móvil, links del header de DocsLayout, back/forward del
  // navegador) pasa por aquí y pide confirmación antes de descartar.
  const blocker = useBlocker(draftIsDirty);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  // Cierre o refresh de la pestaña con draft sucio.
  useEffect(() => {
    if (!draftIsDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [draftIsDirty]);

  // Si la selección cambió por navegación (ya confirmada por el blocker cuando
  // el draft estaba sucio), salir del modo edición: el draft pertenece a otro
  // subtema.
  useEffect(() => {
    const target = editingFor.current;
    if (!editing || !target) return;
    if (activeSubtopicId === target.subtopicId) return;
    editingFor.current = null;
    setEditing(false);
    setSaveError(null);
  }, [editing, activeSubtopicId]);

  // Un slug desconocido (link viejo o con typo) cae al primer subtema: se
  // normaliza la URL para que no mienta ni se comparta rota.
  useEffect(() => {
    if (!slug || !activeSubtopicId) return;
    if (slug !== activeSubtopicId) navigate(`/education/${activeSubtopicId}`, { replace: true });
  }, [slug, activeSubtopicId, navigate]);

  // La página scrollea en window: reset al cambiar de subtema (respetando anclas).
  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo(0, 0);
  }, [activeSubtopicId]);

  const cancelEditing = () => {
    if (draftIsDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
    editingFor.current = null;
    setEditing(false);
    setSaveError(null);
  };

  const goToSubtopic = (subtopicId: string) => {
    if (subtopicId === activeSubtopicId) return;
    navigate(`/education/${subtopicId}`);
  };

  const handleTopicChange = (topic: EducationTopic) => {
    if (topic.id === activeTopic?.id) return;
    const first = topic.subtopics[0];
    if (first) navigate(`/education/${first.id}`);
  };

  const startEditing = () => {
    if (!activeTopic || !activeSubtopic) return;
    editingFor.current = { topicId: activeTopic.id, subtopicId: activeSubtopic.id };
    setDraft({
      title: activeSubtopic.title,
      summary: activeSubtopic.summary,
      content: activeSubtopic.content,
    });
    setSaveError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    const target = editingFor.current;
    if (!target) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await educationService.updateSubtopic(
        target.topicId,
        target.subtopicId,
        { title: draft.title.trim(), summary: draft.summary.trim(), content: draft.content },
        user?.email,
      );
      setTopics((prev) =>
        prev
          ? prev.map((topic) =>
              topic.id !== target.topicId
                ? topic
                : {
                    ...topic,
                    subtopics: topic.subtopics.map((subtopic) =>
                      subtopic.id === updated.id ? updated : subtopic,
                    ),
                  },
            )
          : prev,
      );
      editingFor.current = null;
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <DocsLayout>
        <div className="flex min-h-[calc(100vh-var(--topbar-height))] items-center justify-center px-6 text-center">
          <p className="text-[14px] text-muted-foreground">{loadError}</p>
        </div>
      </DocsLayout>
    );
  }

  if (!topics) {
    return (
      <DocsLayout>
        <div className="flex min-h-[calc(100vh-var(--topbar-height))] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </DocsLayout>
    );
  }

  if (!activeTopic || !activeSubtopic) {
    return (
      <DocsLayout>
        <div className="flex min-h-[calc(100vh-var(--topbar-height))] items-center justify-center px-6 text-center">
          <p className="text-[14px] text-muted-foreground">Todavía no hay temas publicados.</p>
        </div>
      </DocsLayout>
    );
  }

  return (
    <DocsLayout>
      <div className="flex min-h-[calc(100vh-var(--topbar-height))]">
        <aside className="hidden w-full max-w-[300px] border-r border-border bg-card/40 md:block">
          <div className="sticky top-[var(--topbar-height)] max-h-[calc(100vh-var(--topbar-height))] overflow-y-auto p-4">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Aprender</p>
                <h1 className="text-[18px] font-semibold">Education</h1>
              </div>
            </div>

            <div className="space-y-3">
              {topics.map((topic) => {
                const isActive = topic.id === activeTopic.id;
                return (
                  <div key={topic.id} className="rounded-lg border border-border bg-background/40">
                    <button
                      type="button"
                      onClick={() => handleTopicChange(topic)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-primary/8 text-foreground' : 'hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <BookOpenText className="h-4 w-4 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium">{topic.title}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{topic.description}</p>
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isActive ? 'rotate-90' : ''}`} />
                    </button>

                    {isActive && (
                      <div className="border-t border-border bg-card/30 p-2">
                        <div className="space-y-1">
                          {topic.subtopics.map((subtopic) => {
                            const selected = subtopic.id === activeSubtopic.id;
                            return (
                              <button
                                key={subtopic.id}
                                type="button"
                                onClick={() => goToSubtopic(subtopic.id)}
                                className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors ${
                                  selected ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground'
                                }`}
                              >
                                <span className="truncate text-[12px] font-medium">{subtopic.title}</span>
                                <Code2 className="h-3.5 w-3.5 shrink-0" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className={`mx-auto px-6 py-8 lg:px-8 ${editing ? 'max-w-7xl' : 'max-w-4xl'}`}>
            <div className="mb-4 md:hidden">
              <label htmlFor="education-nav" className="sr-only">Tema</label>
              <select
                id="education-nav"
                value={activeSubtopic.id}
                onChange={(event) => goToSubtopic(event.target.value)}
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px] text-foreground"
              >
                {topics.map((topic) => (
                  <optgroup key={topic.id} label={topic.title}>
                    {topic.subtopics.map((subtopic) => (
                      <option key={subtopic.id} value={subtopic.id}>
                        {subtopic.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="mb-6 flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <span>{activeTopic.title}</span>
              <span>/</span>
              <span>{activeSubtopic.title}</span>
            </div>

            {editing ? (
              <div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-6">
                  <div>
                    <p className="mb-1 text-[12px] font-medium uppercase tracking-[0.12em] text-primary">Editando tema</p>
                    {EDUCATION_MOCK_MODE && (
                      <p className="text-[12px] text-muted-foreground">
                        Modo demo: los cambios se guardan solo en este navegador hasta que exista el backend.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={cancelEditing} disabled={saving}>
                      <X className="h-4 w-4" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving || !draft.title.trim()}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar
                    </Button>
                  </div>
                </div>

                {saveError && (
                  <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                    {saveError}
                  </p>
                )}

                <div className="mb-4 space-y-3">
                  <div>
                    <label htmlFor="education-title" className="mb-1 block text-[12px] font-medium text-muted-foreground">
                      Título
                    </label>
                    <Input
                      id="education-title"
                      value={draft.title}
                      onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Título del tema"
                    />
                  </div>
                  <div>
                    <label htmlFor="education-summary" className="mb-1 block text-[12px] font-medium text-muted-foreground">
                      Resumen
                    </label>
                    <Textarea
                      id="education-summary"
                      value={draft.summary}
                      onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))}
                      placeholder="Una o dos líneas que expliquen qué aprenderá el lector"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label htmlFor="education-content" className="mb-1 block text-[12px] font-medium text-muted-foreground">
                      Contenido (markdown)
                    </label>
                    <Textarea
                      id="education-content"
                      value={draft.content}
                      onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
                      className="min-h-[520px] font-mono text-[13px] leading-6"
                      placeholder={'## Título\n\nEscribe el contenido en markdown…'}
                    />
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Soporta: ## y ### títulos, listas (- / 1.), citas (&gt;), bloques ``` de código, **negrita**, *cursiva*, `código` y [links](url).
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-[12px] font-medium text-muted-foreground">Vista previa</p>
                    <div className="max-h-[560px] min-h-[520px] overflow-y-auto rounded-md border border-border bg-card/30 p-5">
                      <MarkdownRenderer content={draft.content} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <header className="mb-6 border-b border-border pb-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.12em] text-primary">Tema</p>
                      <h2 className="text-[30px] font-semibold tracking-tight text-foreground">{activeSubtopic.title}</h2>
                    </div>
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={startEditing}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                    )}
                  </div>
                  <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground">
                    {renderInlineMarkdown(activeSubtopic.summary)}
                  </p>
                </header>

                <article className="max-w-none text-foreground">
                  <MarkdownRenderer content={activeSubtopic.content} />
                </article>
              </>
            )}
          </div>
        </main>
      </div>
    </DocsLayout>
  );
}
