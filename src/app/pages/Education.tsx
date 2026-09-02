import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, ChevronRight, Code2, GraduationCap, Loader2, Pencil, Save, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { educationService, EDUCATION_MOCK_MODE } from '../../services';
import type { EducationTopic } from '../data/educationContent';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';

function renderInlineMarkdown(text: string) {
  const pattern = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^\)]+\))/g;

  const parts = text.split(pattern).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={`${part}-${index}`} className="rounded bg-muted px-1 py-0.5 text-[12px] text-foreground">
          {part.slice(1, -1)}
        </code>
      );
    }

    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>;
    }

    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        return (
          <a key={`${part}-${index}`} href={match[2]} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
            {match[1]}
          </a>
        );
      }
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split('\n');
  const nodes: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const language = line.replace('```', '').trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }

      nodes.push(
        <pre key={`code-${nodes.length}`} className="overflow-x-auto rounded-md border border-border bg-card p-4 text-[12px] text-foreground">
          <code className={language ? `language-${language}` : ''}>{codeLines.join('\n')}</code>
        </pre>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={`h2-${nodes.length}`} className="mt-8 text-[22px] font-semibold text-foreground">
          {renderInlineMarkdown(line.slice(3))}
        </h2>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={`h3-${nodes.length}`} className="mt-6 text-[18px] font-semibold text-foreground">
          {renderInlineMarkdown(line.slice(4))}
        </h3>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith('> ')) {
        items.push(lines[index].slice(2));
        index += 1;
      }
      nodes.push(
        <blockquote key={`quote-${nodes.length}`} className="mt-4 border-l-2 border-primary bg-muted/40 px-4 py-3 text-[14px] text-muted-foreground">
          {items.map((item, idx) => (
            <p key={`${item}-${idx}`} className="mb-1 last:mb-0">
              {renderInlineMarkdown(item)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith('- ')) {
        items.push(lines[index].slice(2));
        index += 1;
      }
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="mt-4 list-disc space-y-2 pl-5 text-[14px] leading-7 text-muted-foreground">
          {items.map((item, idx) => (
            <li key={`${item}-${idx}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="mt-4 list-decimal space-y-2 pl-5 text-[14px] leading-7 text-muted-foreground">
          {items.map((item, idx) => (
            <li key={`${item}-${idx}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith('## ') &&
      !lines[index].startsWith('### ') &&
      !lines[index].startsWith('```') &&
      !lines[index].startsWith('- ') &&
      !/^\d+\.\s+/.test(lines[index]) &&
      !lines[index].startsWith('> ')
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }

    nodes.push(
      <p key={`p-${nodes.length}`} className="mt-4 text-[14px] leading-7 text-muted-foreground">
        {renderInlineMarkdown(paragraph.join(' '))}
      </p>,
    );
  }

  return nodes;
}

interface SubtopicDraft {
  title: string;
  summary: string;
  content: string;
}

export default function Education() {
  const { user } = useAuth();

  const [topics, setTopics] = useState<EducationTopic[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeTopicId, setActiveTopicId] = useState('');
  const [activeSubtopicId, setActiveSubtopicId] = useState('');

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SubtopicDraft>({ title: '', summary: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    educationService
      .getContent(user?.email)
      .then((data) => {
        if (cancelled) return;
        setTopics(data.topics);
        setCanEdit(data.can_edit);
        setActiveTopicId((prev) => (prev ? prev : data.topics[0]?.id ?? ''));
        setActiveSubtopicId((prev) => (prev ? prev : data.topics[0]?.subtopics[0]?.id ?? ''));
      })
      .catch(() => {
        if (!cancelled) setLoadError('No se pudo cargar el contenido. Intenta de nuevo más tarde.');
      });

    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  const activeTopic = useMemo(
    () => topics?.find((topic) => topic.id === activeTopicId) ?? topics?.[0] ?? null,
    [topics, activeTopicId],
  );

  const activeSubtopic = useMemo(() => {
    if (!activeTopic) return null;
    return activeTopic.subtopics.find((subtopic) => subtopic.id === activeSubtopicId) ?? activeTopic.subtopics[0] ?? null;
  }, [activeSubtopicId, activeTopic]);

  const draftIsDirty =
    editing &&
    activeSubtopic !== null &&
    (draft.title !== activeSubtopic.title ||
      draft.summary !== activeSubtopic.summary ||
      draft.content !== activeSubtopic.content);

  // Returns true when it is safe to navigate away from an in-progress edit.
  const confirmLeaveEdit = () => {
    if (!editing) return true;
    if (draftIsDirty && !window.confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return false;
    setEditing(false);
    setSaveError(null);
    return true;
  };

  const handleTopicChange = (topicId: string) => {
    if (topicId === activeTopicId) return;
    if (!confirmLeaveEdit()) return;
    const nextTopic = topics?.find((topic) => topic.id === topicId);
    if (!nextTopic) return;
    setActiveTopicId(nextTopic.id);
    setActiveSubtopicId(nextTopic.subtopics[0]?.id ?? '');
  };

  const handleSubtopicChange = (subtopicId: string) => {
    if (subtopicId === activeSubtopic?.id) return;
    if (!confirmLeaveEdit()) return;
    setActiveSubtopicId(subtopicId);
  };

  const startEditing = () => {
    if (!activeSubtopic) return;
    setDraft({
      title: activeSubtopic.title,
      summary: activeSubtopic.summary,
      content: activeSubtopic.content,
    });
    setSaveError(null);
    setEditing(true);
  };

  const handleSave = async () => {
    if (!activeTopic || !activeSubtopic) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await educationService.updateSubtopic(
        activeTopic.id,
        activeSubtopic.id,
        { title: draft.title.trim(), summary: draft.summary.trim(), content: draft.content },
        user?.email,
      );
      setTopics((prev) =>
        prev
          ? prev.map((topic) =>
              topic.id !== activeTopic.id
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
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return (
      <div className="flex min-h-[calc(100vh-var(--topbar-height))] items-center justify-center bg-background px-6 text-center">
        <p className="text-[14px] text-muted-foreground">{loadError}</p>
      </div>
    );
  }

  if (!topics) {
    return (
      <div className="flex min-h-[calc(100vh-var(--topbar-height))] items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeTopic || !activeSubtopic) {
    return (
      <div className="flex min-h-[calc(100vh-var(--topbar-height))] items-center justify-center bg-background px-6 text-center">
        <p className="text-[14px] text-muted-foreground">Todavía no hay temas publicados.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-var(--topbar-height))] bg-background text-foreground">
      <aside className="w-full max-w-[300px] border-r border-border bg-card/40">
        <div className="sticky top-0 max-h-[calc(100vh-var(--topbar-height))] overflow-y-auto p-4">
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
                    onClick={() => handleTopicChange(topic.id)}
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
                              onClick={() => handleSubtopicChange(subtopic.id)}
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

      <main className="flex-1">
        <div className={`mx-auto px-6 py-8 lg:px-8 ${editing ? 'max-w-7xl' : 'max-w-4xl'}`}>
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
                  <Button variant="outline" size="sm" onClick={confirmLeaveEdit} disabled={saving}>
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
                    {renderMarkdown(draft.content)}
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
                {renderMarkdown(activeSubtopic.content)}
              </article>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
