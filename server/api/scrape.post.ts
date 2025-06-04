import playwright from 'playwright'
import { stringify } from 'csv-stringify/sync'

const getThreadPosts = async (
  context: playwright.BrowserContext,
  isMainArea: boolean
) => {
  const p = context.pages()[0]

  const threadItems = await p.$$("section > div")
  const list = await Promise.all(
    threadItems.map(
      async (item: playwright.ElementHandle, index: number) => {
        try {
          const textContent = await item.textContent()
          if (!textContent) return null
          
          const lines = textContent.trim().split('\n')
          if (lines.length < 2) return null
          
          const firstLine = lines[0]
          const textLines = lines.slice(1).join('\n')
          
          const numberMatch = firstLine.match(/^(\d+):/)
          const number = numberMatch ? numberMatch[1] : (index + 1).toString()
          
          return {
            number,
            text: textLines.trim(),
            textStyle: "",
          }
        } catch (error) {
          return null
        }
      }
    )
  )

  return list.filter(item => item !== null)
}

const getCommentPosts = async (context: playwright.BrowserContext) => {
  const p = context.pages()[0]

  const commentItems = await p.$$("div[id*='comment-']")
  const list = await Promise.all(
    commentItems.map(
      async (item: playwright.ElementHandle) => {
        try {
          const textContent = await item.textContent()
          if (!textContent) return null
          
          const lines = textContent.trim().split('\n')
          if (lines.length < 2) return null
          
          const firstLine = lines[0]
          const textLines = lines.slice(1).join('\n')
          
          const numberMatch = firstLine.match(/^(\d+)\./)
          const number = numberMatch ? numberMatch[1] : ""
          
          return {
            number,
            text: textLines.trim(),
            textStyle: "",
          }
        } catch (error) {
          return null
        }
      }
    )
  )

  return list.filter(item => item !== null)
}

const getMainAreaImages = async (context: playwright.BrowserContext) => {
  const p = context.pages()[0]

  const threadImages = await p.$$("section img")
  const list = await Promise.all(
    threadImages.map(
      async (item: playwright.ElementHandle) => {
        try {
          const src = await item.getAttribute("src")
          if (!src) return null
          
          return {
            img: src.startsWith('//') ? src : src,
          }
        } catch (error) {
          return null
        }
      }
    )
  )

  return list.filter(item => item !== null)
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { threadId } = body

    if (!threadId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Thread ID is required'
      })
    }

    const THREAD_URL = `https://animanch.com/archives/${threadId}.html`

    const browser = await playwright.chromium.launch({
      headless: true,
    })
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto(THREAD_URL)

    const element = await page.locator("article > h1")
    const threadTitle: string = await element.innerText()

    const introAreaList = await getThreadPosts(context, false)
    const mainAreaList = await getThreadPosts(context, true)
    const commentAreaList = await getCommentPosts(context)
    const mainAreaImages = await getMainAreaImages(context)

    const items = [
      {
        number: ``,
        text: `タイトル: ${threadTitle}`,
        textStyle: "xxxxxxxxxxxx",
      },
      {
        number: ``,
        text: `URL: ${THREAD_URL}`,
        textStyle: "xxxxxxxxxxxx",
      },
      ...introAreaList,
      ...mainAreaList,
      {
        number: "xxxxxxxxxxx",
        text: "ここからコメントエリア",
        textStyle: "xxxxxxxxxxxx",
      },
      ...commentAreaList,
      {
        number: "xxxxxxxxxxx",
        text: "ここからメインエリアの画像",
        textStyle: "xxxxxxxxxxxx",
      },
      ...mainAreaImages.map((item) => ({
        number: "",
        text: `https:${item.img}`,
        textStyle: "",
      })),
    ]

    const data: {
      number: string | null
      text: string | null
      style: string | null
    }[] = []
    
    items.forEach((item) => {
      data.push({
        number: item.number,
        text: item.text,
        style: item.textStyle,
      })
    })

    const csvData = stringify(data, { header: true })

    await browser.close()

    return {
      success: true,
      csvData,
      parsedData: data,
      threadTitle,
      threadUrl: THREAD_URL
    }

  } catch (error) {
    console.error('Scraping error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: (error as Error).message || 'スクレイピングに失敗しました'
    })
  }
})
