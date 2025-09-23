import React from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Label } from '@/components/ui/label';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean']
  ],
};

const formats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'blockquote', 'code-block',
  'link', 'image'
];

export default function RichTextEditor({ 
  value, 
  onChange, 
  label = "Description",
  placeholder = "Write your campaign description...",
  error 
}: RichTextEditorProps) {
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="border border-input rounded-lg overflow-hidden bg-background">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          className="rich-text-editor"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <style>{`
        .rich-text-editor .ql-editor {
          min-height: 150px;
          font-size: 14px;
          line-height: 1.5;
        }
        .rich-text-editor .ql-toolbar {
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--muted));
        }
        .rich-text-editor .ql-container {
          border: none;
          font-family: inherit;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
      `}</style>
    </div>
  );
}