import { describe, it, expect } from 'vitest'
import { stripHtmlTags } from '@/lib/utils'

describe('stripHtmlTags', () => {
  it('should remove simple HTML tags', () => {
    const html = '<p>Hello World</p>'
    expect(stripHtmlTags(html)).toBe('Hello World')
  })

  it('should remove multiple HTML tags', () => {
    const html = '<p>This is <strong>bold</strong> and <em>italic</em> text</p>'
    expect(stripHtmlTags(html)).toBe('This is bold and italic text')
  })

  it('should remove nested HTML tags', () => {
    const html = '<div><p><span>Nested content</span></p></div>'
    expect(stripHtmlTags(html)).toBe('Nested content')
  })

  it('should handle HTML with attributes', () => {
    const html = '<p class="text-gray-500">Text with attributes</p>'
    expect(stripHtmlTags(html)).toBe('Text with attributes')
  })

  it('should handle complex HTML from rich text editor', () => {
    const html = '<h1>Title</h1><p>First paragraph</p><ul><li>Item 1</li><li>Item 2</li></ul>'
    expect(stripHtmlTags(html)).toBe('TitleFirst paragraphItem 1Item 2')
  })

  it('should handle HTML with line breaks', () => {
    const html = '<p>Line 1</p>\n<p>Line 2</p>'
    expect(stripHtmlTags(html)).toBe('Line 1\nLine 2')
  })

  it('should return empty string for empty input', () => {
    expect(stripHtmlTags('')).toBe('')
  })

  it('should return empty string for null input', () => {
    expect(stripHtmlTags(null as unknown as string)).toBe('')
  })

  it('should return empty string for undefined input', () => {
    expect(stripHtmlTags(undefined as unknown as string)).toBe('')
  })

  it('should handle plain text without HTML tags', () => {
    const text = 'Plain text without tags'
    expect(stripHtmlTags(text)).toBe('Plain text without tags')
  })

  it('should handle self-closing tags', () => {
    const html = '<p>Text with <br/> line break</p>'
    expect(stripHtmlTags(html)).toBe('Text with  line break')
  })

  it('should handle HTML entities as-is', () => {
    const html = '<p>&lt;div&gt; entity test &amp;</p>'
    expect(stripHtmlTags(html)).toBe('&lt;div&gt; entity test &amp;')
  })
})
