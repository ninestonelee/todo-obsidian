import { test, expect, Page } from '@playwright/test';

async function addTodo(page: Page, text: string, category?: string, priority?: string) {
  await page.fill('#todoInput', text);
  if (category) await page.selectOption('#catSelect', category);
  if (priority) await page.selectOption('#prioritySelect', priority);
  await page.click('.btn-add');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.app-header');
});

test.describe('할 일 추가', () => {
  test('텍스트 입력 후 추가하면 목록에 표시된다', async ({ page }) => {
    await addTodo(page, '테스트 할 일');
    await expect(page.locator('.todo-item')).toHaveCount(1);
    await expect(page.locator('.todo-text')).toHaveText('테스트 할 일');
  });

  test('빈 텍스트는 추가되지 않는다', async ({ page }) => {
    await page.click('.btn-add');
    await expect(page.locator('.todo-item')).toHaveCount(0);
  });

  test('카테고리와 우선순위가 올바르게 표시된다', async ({ page }) => {
    await addTodo(page, '중요한 일', '업무', 'high');
    await expect(page.locator('.badge-cat')).toHaveText('업무');
    await expect(page.locator('.badge-priority')).toHaveText('높음');
  });
});

test.describe('완료 토글', () => {
  test('체크박스 클릭 시 완료 상태가 토글된다', async ({ page }) => {
    await addTodo(page, '토글 테스트');
    const todoItem = page.locator('.todo-item');

    await expect(todoItem).not.toHaveClass(/completed/);
    await page.locator('.todo-checkbox').click();
    await expect(todoItem).toHaveClass(/completed/);

    // 다시 클릭하면 미완료로 복원
    await page.locator('.todo-checkbox').click();
    await expect(todoItem).not.toHaveClass(/completed/);
  });
});

test.describe('삭제', () => {
  test('삭제 버튼 클릭 시 목록에서 제거된다', async ({ page }) => {
    await addTodo(page, '삭제할 일');
    await expect(page.locator('.todo-item')).toHaveCount(1);

    await page.locator('[data-delete]').click();
    await expect(page.locator('.todo-item')).toHaveCount(0);
  });
});

test.describe('카테고리 필터', () => {
  test('카테고리 탭 클릭 시 해당 카테고리만 표시된다', async ({ page }) => {
    await addTodo(page, '업무 할 일', '업무');
    await addTodo(page, '개인 할 일', '개인');

    // '업무' 탭 클릭
    await page.locator('.cat-tab', { hasText: '업무' }).click();
    await expect(page.locator('.todo-item')).toHaveCount(1);
    await expect(page.locator('.todo-text')).toHaveText('업무 할 일');

    // '전체' 탭 클릭
    await page.locator('.cat-tab', { hasText: '전체' }).click();
    await expect(page.locator('.todo-item')).toHaveCount(2);
  });
});

test.describe('상태 필터', () => {
  test('진행중/완료/전체 필터가 동작한다', async ({ page }) => {
    await addTodo(page, '진행중 할 일');
    await addTodo(page, '완료된 할 일');
    // 두 번째 할 일을 완료 처리
    await page.locator('.todo-checkbox').nth(0).click();

    // 진행중 필터
    await page.locator('.pill[data-filter="active"]').click();
    await expect(page.locator('.todo-item')).toHaveCount(1);

    // 완료 필터
    await page.locator('.pill[data-filter="completed"]').click();
    await expect(page.locator('.todo-item')).toHaveCount(1);

    // 전체 필터
    await page.locator('.pill[data-filter="all"]').click();
    await expect(page.locator('.todo-item')).toHaveCount(2);
  });
});

test.describe('검색', () => {
  test('검색어 입력 시 매칭 항목만 표시된다', async ({ page }) => {
    await addTodo(page, '장보기');
    await addTodo(page, '운동하기');
    await addTodo(page, '장보기 목록 작성');

    await page.fill('#searchInput', '장보기');
    await expect(page.locator('.todo-item')).toHaveCount(2);

    // 검색어 지우면 전체 표시
    await page.fill('#searchInput', '');
    await expect(page.locator('.todo-item')).toHaveCount(3);
  });
});

test.describe('통계 표시', () => {
  test('할 일 추가/완료 시 통계가 정확하다', async ({ page }) => {
    await expect(page.locator('#statTotal')).toHaveText('0');

    await addTodo(page, '할 일 1');
    await addTodo(page, '할 일 2');
    await addTodo(page, '할 일 3');

    await expect(page.locator('#statTotal')).toHaveText('3');
    await expect(page.locator('#statActive')).toHaveText('3');
    await expect(page.locator('#statCompleted')).toHaveText('0');
    await expect(page.locator('#statRate')).toHaveText('0%');

    // 1개 완료
    await page.locator('.todo-checkbox').first().click();
    await expect(page.locator('#statCompleted')).toHaveText('1');
    await expect(page.locator('#statActive')).toHaveText('2');
    await expect(page.locator('#statRate')).toHaveText('33%');
  });
});

test.describe('LocalStorage 영속성', () => {
  test('페이지 새로고침 후에도 데이터가 유지된다', async ({ page }) => {
    await addTodo(page, '영속성 테스트');
    await expect(page.locator('.todo-item')).toHaveCount(1);

    await page.reload();
    await page.waitForSelector('.app-header');
    await expect(page.locator('.todo-item')).toHaveCount(1);
    await expect(page.locator('.todo-text')).toHaveText('영속성 테스트');
  });
});

test.describe('카테고리 추가', () => {
  test('새 카테고리를 추가하면 탭과 셀렉트에 반영된다', async ({ page }) => {
    await page.locator('#addCatBtn').click();
    await page.fill('#newCatInput', '건강');
    await page.locator('#confirmCatBtn').click();

    // 카테고리 탭에 표시
    await expect(page.locator('.cat-tab', { hasText: '건강' })).toBeVisible();
    // 셀렉트에 표시
    await expect(page.locator('#catSelect option', { hasText: '건강' })).toBeAttached();
  });
});

test.describe('우선순위 정렬', () => {
  test('높음 > 보통 > 낮음 순서로 정렬된다', async ({ page }) => {
    await addTodo(page, '낮음 할 일', '업무', 'low');
    await addTodo(page, '높음 할 일', '업무', 'high');
    await addTodo(page, '보통 할 일', '업무', 'medium');

    const items = page.locator('.todo-item');
    await expect(items.nth(0)).toHaveAttribute('data-priority', 'high');
    await expect(items.nth(1)).toHaveAttribute('data-priority', 'medium');
    await expect(items.nth(2)).toHaveAttribute('data-priority', 'low');
  });
});
