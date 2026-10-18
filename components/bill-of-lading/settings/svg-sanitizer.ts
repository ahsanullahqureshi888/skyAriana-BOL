/**
 * SVG Sanitizer & Security Validator
 * 
 * Enforces strict vector safety for uploaded watermarks.
 * Removes malicious tags, scripts, foreignObject elements, event listeners,
 * and dangerous URI protocols before rendering or storing.
 */

export interface SvgSanitizationResult {
  isValid: boolean
  sanitizedSvg: string
  error?: string
  width?: number
  height?: number
  viewBox?: string
}

const FORBIDDEN_TAGS = [
  'script',
  'foreignobject',
  'iframe',
  'embed',
  'object',
  'applet',
  'meta',
  'link',
  'base',
  'frame',
  'frameset',
]

const FORBIDDEN_PROTOCOLS = ['javascript:', 'data:text/html', 'vbscript:', 'file:']

export function sanitizeSvgString(rawSvg: string): SvgSanitizationResult {
  if (!rawSvg || typeof rawSvg !== 'string') {
    return { isValid: false, sanitizedSvg: '', error: 'Empty or invalid SVG content provided' }
  }

  // Pre-check for plain text / basic tags
  const trimmed = rawSvg.trim()
  if (!trimmed.toLowerCase().includes('<svg')) {
    return { isValid: false, sanitizedSvg: '', error: 'Missing root <svg> element' }
  }

  // If DOMParser is not available (e.g. Node.js environment during unit tests), use regex sanitization
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return sanitizeSvgRegex(rawSvg)
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(rawSvg, 'image/svg+xml')

    const parserError = doc.querySelector('parsererror')
    if (parserError) {
      return { isValid: false, sanitizedSvg: '', error: `SVG XML Parsing Error: ${parserError.textContent?.slice(0, 100)}` }
    }

    const svgElement = doc.documentElement
    if (!svgElement || svgElement.nodeName.toLowerCase() !== 'svg') {
      return { isValid: false, sanitizedSvg: '', error: 'Root element is not an SVG' }
    }

    // 1. Remove all forbidden elements
    FORBIDDEN_TAGS.forEach((tag) => {
      const elements = doc.querySelectorAll(tag)
      elements.forEach((el) => el.remove())
    })

    // 2. Remove any elements with inline event handlers or dangerous attributes
    const allElements = doc.querySelectorAll('*')
    allElements.forEach((el) => {
      const attributeNames = Array.from(el.attributes).map((a) => a.name)
      attributeNames.forEach((attrName) => {
        const lowerName = attrName.toLowerCase()
        const attrVal = (el.getAttribute(attrName) || '').trim().toLowerCase()

        // Remove any on* event handlers (onclick, onload, onerror, etc.)
        if (lowerName.startsWith('on')) {
          el.removeAttribute(attrName)
        }

        // Remove dangerous URI protocols from href, xlink:href, src, etc.
        if (
          lowerName === 'href' ||
          lowerName === 'xlink:href' ||
          lowerName === 'src' ||
          lowerName === 'action'
        ) {
          if (FORBIDDEN_PROTOCOLS.some((proto) => attrVal.startsWith(proto))) {
            el.removeAttribute(attrName)
          }
          // Remove external remote web links to guarantee 100% offline self-containment
          if (attrVal.startsWith('http://') || attrVal.startsWith('https://')) {
            el.removeAttribute(attrName)
          }
        }
      })
    })

    // 3. Ensure viewBox or default width/height
    let viewBox = svgElement.getAttribute('viewBox')
    const widthStr = svgElement.getAttribute('width')
    const heightStr = svgElement.getAttribute('height')

    if (!viewBox && widthStr && heightStr) {
      const w = parseFloat(widthStr) || 900
      const h = parseFloat(heightStr) || 1400
      viewBox = `0 0 ${w} ${h}`
      svgElement.setAttribute('viewBox', viewBox)
    }

    if (!svgElement.getAttribute('viewBox')) {
      svgElement.setAttribute('viewBox', '0 0 900 1400')
    }

    const serializer = new XMLSerializer()
    const cleanSvg = serializer.serializeToString(svgElement)

    return {
      isValid: true,
      sanitizedSvg: cleanSvg,
      viewBox: svgElement.getAttribute('viewBox') || '0 0 900 1400',
    }
  } catch (err: any) {
    return { isValid: false, sanitizedSvg: '', error: `Sanitization failure: ${err?.message || 'Unknown error'}` }
  }
}

/**
 * Regex-based fallback sanitizer for Node.js / offline test runner environments
 */
function sanitizeSvgRegex(rawSvg: string): SvgSanitizationResult {
  let cleaned = rawSvg

  // Remove script tags and contents
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')

  // Remove foreignObject tags and contents
  cleaned = cleaned.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')

  // Remove inline on* handlers
  cleaned = cleaned.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')

  // Remove javascript: hrefs
  cleaned = cleaned.replace(/(href|xlink:href)\s*=\s*['"]javascript:[^'"]*['"]/gi, '')

  // Ensure root svg exists
  if (!cleaned.includes('<svg')) {
    return { isValid: false, sanitizedSvg: '', error: 'Invalid SVG content' }
  }

  return {
    isValid: true,
    sanitizedSvg: cleaned,
    viewBox: '0 0 900 1400',
  }
}
