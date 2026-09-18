import { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Stack,
  Text,
  TextInput,
} from "@sanity/ui";
import DOMPurify from "dompurify";
import {
  MarkdownInput,
  type MarkdownInputProps,
} from "sanity-plugin-markdown";
import { useClient } from "sanity";
import { renderMarkdown } from "../lib/markdown";
import "./markdownEditor.css";

type CodeMirrorLike = {
  getSelection: () => string;
  getCursor: (start?: "start" | "end" | "head" | "anchor") => { line: number; ch: number };
  setSelection: (from: { line: number; ch: number }, to?: { line: number; ch: number }) => void;
  replaceSelection: (text: string) => void;
  focus: () => void;
};

type MdeInstance = {
  codemirror?: CodeMirrorLike;
  updateStatusBar?: (item: string, content: string) => void;
};

type PendingImage = {
  file: File;
  previewUrl: string;
  /** Resolves when the dialog finishes (insert succeeded or user cancelled). */
  resolve: (inserted: boolean) => void;
};

type PendingLink = {
  text: string;
  from: { line: number; ch: number };
  to: { line: number; ch: number };
};

const STATUS_IDLE = "Upload via the image button, or drag and drop / paste.";

function humanizeFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!base) return "";
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Escape characters that would break Markdown image syntax. */
function sanitizeAlt(alt: string): string {
  return alt.trim().replace(/[[\]]/g, "");
}

function sanitizeCaption(caption: string): string {
  return caption.trim().replace(/"/g, "'");
}

function buildImageMarkdown(url: string, alt: string, caption: string): string {
  const a = sanitizeAlt(alt);
  const c = sanitizeCaption(caption);
  if (c) return `![${a}](${url} "${c}")`;
  return `![${a}](${url})`;
}

/** Encode URL for Markdown link destinations (matches EasyMDE’s escape). */
function escapeLinkUrl(url: string): string {
  return encodeURI(url.trim()).replace(/([\\()])/g, "\\$1");
}

function sanitizeLinkText(text: string): string {
  return text.replace(/[[\]]/g, "");
}

function buildLinkMarkdown(text: string, url: string): string {
  const label = sanitizeLinkText(text.trim()) || url.trim();
  return `[${label}](${escapeLinkUrl(url)})`;
}

/** Same HTML as the public site, wrapped for Studio preview chrome. */
function renderStudioPreview(markdownText: string): string {
  const html = renderMarkdown(markdownText || "");
  return DOMPurify.sanitize(`<div class="rbe-md-preview">${html}</div>`, {
    ADD_ATTR: ["target", "rel", "loading", "decoding"],
  });
}

/**
 * Body markdown editor.
 *
 * - Link: dialog for label + URL (selection preserved)
 * - Image: local preview → Insert uploads / Cancel discards
 *
 * Editor chrome (sticky toolbar, preview typography) lives in markdownEditor.css.
 */
export function MarkdownBodyInput(props: MarkdownInputProps) {
  const client = useClient({ apiVersion: "2022-01-01" });
  const mdeRef = useRef<MdeInstance | null>(null);
  const queueRef = useRef(Promise.resolve());
  /**
   * EasyMDE's stock picker leaves `change` listeners after a cancelled dialog.
   * Our picker avoids that; this also drops duplicate drop/paste events that
   * reuse the same `File` object.
   */
  const seenFilesRef = useRef<WeakSet<File>>(new WeakSet());

  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [inserting, setInserting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const setStatus = useCallback((message: string) => {
    mdeRef.current?.updateStatusBar?.("upload-image", message);
  }, []);

  const finishImagePending = useCallback((inserted: boolean) => {
    setPendingImage((current) => {
      if (!current) return null;
      URL.revokeObjectURL(current.previewUrl);
      current.resolve(inserted);
      return null;
    });
    setInserting(false);
    setUploadError(null);
  }, []);

  /** Local preview first — upload only on Insert. */
  const openImagePreview = useCallback((file: File) => {
    const previewUrl = URL.createObjectURL(file);
    return new Promise<boolean>((resolve) => {
      setAlt(humanizeFilename(file.name));
      setCaption("");
      setInserting(false);
      setUploadError(null);
      setPendingImage({ file, previewUrl, resolve });
    });
  }, []);

  const cancelImage = useCallback(() => {
    if (inserting) return;
    finishImagePending(false);
  }, [finishImagePending, inserting]);

  const confirmImage = useCallback(async () => {
    if (!pendingImage || inserting) return;
    setInserting(true);
    setUploadError(null);
    setStatus(`Uploading ${pendingImage.file.name}…`);
    try {
      const asset = await client.assets.upload("image", pendingImage.file);
      const markdown = buildImageMarkdown(asset.url, alt, caption);
      mdeRef.current?.codemirror?.replaceSelection(`${markdown}\n`);
      setStatus(`Inserted ${pendingImage.file.name}`);
      finishImagePending(true);
      window.setTimeout(() => setStatus(STATUS_IDLE), 4000);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setUploadError(message);
      setStatus(message);
      setInserting(false);
    }
  }, [alt, caption, client, finishImagePending, inserting, pendingImage, setStatus]);

  const processFile = useCallback(
    async (file: File) => {
      if (seenFilesRef.current.has(file)) return;
      seenFilesRef.current.add(file);

      const inserted = await openImagePreview(file);
      if (!inserted) {
        setStatus("Cancelled");
        window.setTimeout(() => setStatus(STATUS_IDLE), 2500);
      }
    },
    [openImagePreview, setStatus],
  );

  const processFiles = useCallback(
    (files: ArrayLike<File> | null) => {
      if (!files) return;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        queueRef.current = queueRef.current.then(() => processFile(file));
      }
    },
    [processFile],
  );

  const openFilePicker = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png, image/jpeg, image/gif, image/webp, image/avif, image/svg+xml";
    input.multiple = true;
    input.style.display = "none";
    input.addEventListener(
      "change",
      () => {
        processFiles(input.files);
        input.remove();
      },
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
  }, [processFiles]);

  /**
   * Capture selection before the dialog steals focus, then ask for the URL.
   * EasyMDE’s default `link` action only wraps with `[](url)` / browser prompt.
   */
  const openLinkDialog = useCallback(() => {
    const cm = mdeRef.current?.codemirror;
    if (!cm) return;
    const from = cm.getCursor("start");
    const to = cm.getCursor("end");
    const selected = cm.getSelection();
    setLinkText(selected);
    setLinkUrl(selected.match(/^https?:\/\//i) ? selected : "https://");
    setPendingLink({ text: selected, from, to });
  }, []);

  const cancelLink = useCallback(() => {
    setPendingLink(null);
    window.setTimeout(() => mdeRef.current?.codemirror?.focus(), 0);
  }, []);

  const confirmLink = useCallback(() => {
    if (!pendingLink) return;
    const url = linkUrl.trim();
    if (!url || url === "https://") return;

    const cm = mdeRef.current?.codemirror;
    if (!cm) return;

    const markdown = buildLinkMarkdown(linkText || pendingLink.text, url);
    cm.setSelection(pendingLink.from, pendingLink.to);
    cm.replaceSelection(markdown);
    setPendingLink(null);
    window.setTimeout(() => cm.focus(), 0);
  }, [linkText, linkUrl, pendingLink]);

  const reactMdeProps: NonNullable<MarkdownInputProps["reactMdeProps"]> = useMemo(
    () => ({
      getMdeInstance: (instance) => {
        const mde = instance as MdeInstance & {
          codemirror?: CodeMirrorLike & {
            addKeyMap?: (map: Record<string, () => void>) => void;
          };
        };
        mdeRef.current = mde;
        // Stock ⌘/Ctrl+K maps to EasyMDE drawLink — point it at our dialog instead.
        mde.codemirror?.addKeyMap?.({
          "Cmd-K": openLinkDialog,
          "Ctrl-K": openLinkDialog,
        });
      },
      options: {
        /**
         * Built-ins omitted / replaced:
         * - `link` → custom dialog (label + URL)
         * - `image` → custom insert-image flow
         * - `heading-smaller` / `heading-bigger` — redundant with H1–H3
         */
        toolbar: [
          "undo",
          "redo",
          "|",
          "bold",
          "italic",
          "strikethrough",
          "heading-1",
          "heading-2",
          "heading-3",
          "|",
          "quote",
          "unordered-list",
          "ordered-list",
          "check-list",
          "|",
          {
            name: "rbe-link",
            className: "fa fa-link",
            title: "Insert link (⌘/Ctrl+K)",
            action: openLinkDialog,
          },
          {
            name: "rbe-upload-image",
            className: "fa fa-image",
            title: "Insert image",
            action: openFilePicker,
          },
          "table",
          "horizontal-rule",
          "code",
          "clean-block",
          "|",
          "preview",
          "side-by-side",
          "fullscreen",
          "|",
          "guide",
        ],
        // Disable EasyMDE’s stock drawLink shortcut (we bind our own above).
        shortcuts: {
          drawLink: null,
        },
        status: ["upload-image"],
        uploadImage: true,
        imageUploadFunction: (file: File) => {
          processFiles([file]);
        },
        previewRender: renderStudioPreview,
        errorCallback: () => {},
        imageTexts: {
          sbInit: STATUS_IDLE,
          sbOnDragEnter: "Drop image to preview…",
          sbOnDrop: "Opening #images_names#…",
        },
      },
    }),
    [openFilePicker, openLinkDialog, processFiles],
  );

  return (
    <>
      <MarkdownInput {...props} reactMdeProps={reactMdeProps} />

      {pendingLink ? (
        <Dialog
          header="Insert link"
          id="rbe-markdown-link"
          width={1}
          zOffset={10_000}
          onClose={cancelLink}
          footer={
            <Flex gap={2} justify="flex-end" padding={3}>
              <Button mode="bleed" text="Cancel" onClick={cancelLink} />
              <Button
                tone="primary"
                text="Insert"
                disabled={!linkUrl.trim() || linkUrl.trim() === "https://"}
                onClick={confirmLink}
              />
            </Flex>
          }
        >
          <Box padding={4}>
            <Stack gap={4}>
              <Text size={1} muted>
                Selected text becomes the link label. Paste or type the URL,
                then Insert.
              </Text>
              <Stack gap={2}>
                <Text size={1} weight="semibold">
                  Link text
                </Text>
                <TextInput
                  value={linkText}
                  placeholder="Text to display"
                  onChange={(event) => setLinkText(event.currentTarget.value)}
                />
              </Stack>
              <Stack gap={2}>
                <Text size={1} weight="semibold">
                  URL
                </Text>
                <TextInput
                  autoFocus
                  value={linkUrl}
                  placeholder="https://"
                  onChange={(event) => setLinkUrl(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      confirmLink();
                    }
                  }}
                />
              </Stack>
            </Stack>
          </Box>
        </Dialog>
      ) : null}

      {pendingImage ? (
        <Dialog
          header="Insert image"
          id="rbe-markdown-image-preview"
          width={1}
          zOffset={10_000}
          onClose={cancelImage}
          footer={
            <Flex gap={2} justify="flex-end" padding={3}>
              <Button
                mode="bleed"
                text="Cancel"
                disabled={inserting}
                onClick={cancelImage}
              />
              <Button
                tone="primary"
                text={inserting ? "Uploading…" : "Insert"}
                disabled={inserting}
                onClick={() => {
                  void confirmImage();
                }}
              />
            </Flex>
          }
        >
          <Box padding={4}>
            <Stack gap={4}>
              <Text size={1} muted>
                Preview the image, set alt text, and an optional caption. Insert
                uploads to Media and adds it to the body. Cancel discards the
                file — nothing is uploaded.
              </Text>
              <Box
                style={{
                  maxHeight: 220,
                  overflow: "hidden",
                  borderRadius: 6,
                  background: "var(--card-muted-bg-color)",
                }}
              >
                <img
                  src={pendingImage.previewUrl}
                  alt=""
                  style={{
                    display: "block",
                    width: "100%",
                    height: 220,
                    objectFit: "contain",
                  }}
                />
              </Box>
              <Text size={1} muted>
                {pendingImage.file.name}
              </Text>
              {uploadError ? (
                <Text size={1} style={{ color: "var(--card-badge-critical-fg-color, #b71c1c)" }}>
                  {uploadError}
                </Text>
              ) : null}
              <Stack gap={2}>
                <Text size={1} weight="semibold">
                  Alt text
                </Text>
                <TextInput
                  value={alt}
                  disabled={inserting}
                  placeholder="Describe the image"
                  onChange={(event) => setAlt(event.currentTarget.value)}
                />
              </Stack>
              <Stack gap={2}>
                <Text size={1} weight="semibold">
                  Caption (optional)
                </Text>
                <TextInput
                  value={caption}
                  disabled={inserting}
                  placeholder="Leave blank for no caption"
                  onChange={(event) => setCaption(event.currentTarget.value)}
                />
              </Stack>
            </Stack>
          </Box>
        </Dialog>
      ) : null}
    </>
  );
}
