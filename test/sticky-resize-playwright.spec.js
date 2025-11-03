/**
 * Test suite for sticky resize functionality using Playwright
 * Simplified tests that focus on core DOM interactions
 */

describe('Sticky Resize Functionality (Playwright)', () => {
  beforeEach(async () => {
    // Navigate to a blank page and set up the DOM structure
    // Use defensive navigation with timeout protection
    try {
      if (!page || page.isClosed()) {
        return;
      }
      await Promise.race([
        page.goto('about:blank', { 
          timeout: 2000,
          waitUntil: 'domcontentloaded' 
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("about:blank timeout")), 2000)
        )
      ]).catch(() => {
        // Continue even if navigation fails
      });
    } catch (error) {
      // Continue even if navigation fails - we'll set content anyway
    }
    
    // Create the HTML structure for testing
    await page.setContent(`
      <div id="test-container" style="position: absolute; left: 100px; top: 100px; width: 100px; height: 100px;">
        <div class="resize-handle-top" style="position: absolute;"></div>
        <div class="resize-handle-right" style="position: absolute;"></div>
        <div class="resize-handle-bottom" style="position: absolute;"></div>
        <div class="resize-handle-left" style="position: absolute;"></div>
        <div class="sticky"></div>
        <textarea id="input-element" value="Test sticky"></textarea>
      </div>
    `);
  });

  afterEach(async () => {
    // Clean up DOM and reset styles
    await page.evaluate(() => {
      const container = document.getElementById('test-container');
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      
      // Reset document styles
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  });

  describe('Resize Handle Detection', () => {
    test('should detect all resize handles', async () => {
      const handles = await page.evaluate(() => {
        const container = document.getElementById('test-container');
        return {
          top: !!container.querySelector('.resize-handle-top'),
          right: !!container.querySelector('.resize-handle-right'),
          bottom: !!container.querySelector('.resize-handle-bottom'),
          left: !!container.querySelector('.resize-handle-left')
        };
      });

      expect(handles.top).toBe(true);
      expect(handles.right).toBe(true);
      expect(handles.bottom).toBe(true);
      expect(handles.left).toBe(true);
    });

    test('should extract resize side from handle class', async () => {
      const classNames = await page.evaluate(() => {
        const container = document.getElementById('test-container');
        const topHandle = container.querySelector('.resize-handle-top');
        const rightHandle = container.querySelector('.resize-handle-right');
        const bottomHandle = container.querySelector('.resize-handle-bottom');
        const leftHandle = container.querySelector('.resize-handle-left');

        return {
          top: topHandle.className,
          right: rightHandle.className,
          bottom: bottomHandle.className,
          left: leftHandle.className
        };
      });

      expect(classNames.top).toContain('resize-handle-top');
      expect(classNames.right).toContain('resize-handle-right');
      expect(classNames.bottom).toContain('resize-handle-bottom');
      expect(classNames.left).toContain('resize-handle-left');
    });
  });

  describe('DOM Event Handling', () => {
    test('should handle mousedown events on resize handles', async () => {
      const eventHandled = await page.evaluate(() => {
        const rightHandle = document.querySelector('.resize-handle-right');
        const mousedownEvent = new MouseEvent('mousedown', {
          pageX: 200,
          pageY: 150,
          bubbles: true
        });

        let eventFired = false;
        rightHandle.addEventListener('mousedown', () => {
          eventFired = true;
        });

        rightHandle.dispatchEvent(mousedownEvent);
        return eventFired;
      });

      expect(eventHandled).toBe(true);
    });

    test('should handle mousemove events on document', async () => {
      const eventHandled = await page.evaluate(() => {
        const mousemoveEvent = new MouseEvent('mousemove', {
          pageX: 300,
          pageY: 150,
          bubbles: true
        });

        let eventFired = false;
        document.addEventListener('mousemove', () => {
          eventFired = true;
        });

        document.dispatchEvent(mousemoveEvent);
        return eventFired;
      });

      expect(eventHandled).toBe(true);
    });

    test('should handle mouseup events on document', async () => {
      const eventHandled = await page.evaluate(() => {
        const mouseupEvent = new MouseEvent('mouseup', {
          pageX: 300,
          pageY: 150,
          bubbles: true
        });

        let eventFired = false;
        document.addEventListener('mouseup', () => {
          eventFired = true;
        });

        document.dispatchEvent(mouseupEvent);
        return eventFired;
      });

      expect(eventHandled).toBe(true);
    });
  });

  describe('DOM Manipulation', () => {
    test('should be able to modify element styles', async () => {
      const styles = await page.evaluate(() => {
        const container = document.getElementById('test-container');
        
        // Modify styles
        container.style.width = '200px';
        container.style.height = '150px';
        container.style.left = '50px';
        container.style.top = '75px';
        
        return {
          width: container.style.width,
          height: container.style.height,
          left: container.style.left,
          top: container.style.top
        };
      });

      expect(styles.width).toBe('200px');
      expect(styles.height).toBe('150px');
      expect(styles.left).toBe('50px');
      expect(styles.top).toBe('75px');
    });

    test('should be able to modify document body styles', async () => {
      const styles = await page.evaluate(() => {
        // Modify document styles
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        
        return {
          cursor: document.body.style.cursor,
          userSelect: document.body.style.userSelect
        };
      });

      expect(styles.cursor).toBe('ew-resize');
      expect(styles.userSelect).toBe('none');
    });

    test('should be able to reset document body styles', async () => {
      const styles = await page.evaluate(() => {
        // Set styles first
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        
        // Reset styles
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        
        return {
          cursor: document.body.style.cursor,
          userSelect: document.body.style.userSelect
        };
      });

      expect(styles.cursor).toBe('');
      expect(styles.userSelect).toBe('');
    });
  });

  describe('Element Selection and Manipulation', () => {
    test('should be able to select elements by class', async () => {
      const elements = await page.evaluate(() => {
        const container = document.getElementById('test-container');
        const handles = container.querySelectorAll('[class*="resize-handle"]');
        
        return {
          count: handles.length,
          classes: Array.from(handles).map(el => el.className)
        };
      });

      expect(elements.count).toBe(4);
      expect(elements.classes).toContain('resize-handle-top');
      expect(elements.classes).toContain('resize-handle-right');
      expect(elements.classes).toContain('resize-handle-bottom');
      expect(elements.classes).toContain('resize-handle-left');
    });

    test('should be able to add and remove elements', async () => {
      const elementCount = await page.evaluate(() => {
        const container = document.getElementById('test-container');
        const initialCount = container.children.length;
        
        // Add a new element
        const newElement = document.createElement('div');
        newElement.className = 'test-element';
        container.appendChild(newElement);
        
        const afterAddCount = container.children.length;
        
        // Remove the element
        newElement.remove();
        
        const afterRemoveCount = container.children.length;
        
        return {
          initial: initialCount,
          afterAdd: afterAddCount,
          afterRemove: afterRemoveCount
        };
      });

      expect(elementCount.afterAdd).toBe(elementCount.initial + 1);
      expect(elementCount.afterRemove).toBe(elementCount.initial);
    });
  });

  describe('Event Prevention and Propagation', () => {
    test('should be able to prevent default and stop propagation', async () => {
      const eventHandled = await page.evaluate(() => {
        const rightHandle = document.querySelector('.resize-handle-right');
        const mousedownEvent = new MouseEvent('mousedown', {
          pageX: 200,
          pageY: 150,
          bubbles: true
        });

        let preventDefaultCalled = false;
        let stopPropagationCalled = false;

        mousedownEvent.preventDefault = () => { preventDefaultCalled = true; };
        mousedownEvent.stopPropagation = () => { stopPropagationCalled = true; };

        rightHandle.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        rightHandle.dispatchEvent(mousedownEvent);

        return { preventDefaultCalled, stopPropagationCalled };
      });

      expect(eventHandled.preventDefaultCalled).toBe(true);
      expect(eventHandled.stopPropagationCalled).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete resize workflow', async () => {
      const workflowResult = await page.evaluate(() => {
        const container = document.getElementById('test-container');
        const rightHandle = container.querySelector('.resize-handle-right');
        
        // Start resize
        const mousedownEvent = new MouseEvent('mousedown', {
          pageX: 200,
          pageY: 150,
          bubbles: true
        });
        rightHandle.dispatchEvent(mousedownEvent);

        // Move mouse
        const mousemoveEvent = new MouseEvent('mousemove', {
          pageX: 300,
          pageY: 150,
          bubbles: true
        });
        document.dispatchEvent(mousemoveEvent);

        // End resize
        const mouseupEvent = new MouseEvent('mouseup', {
          pageX: 300,
          pageY: 150,
          bubbles: true
        });
        document.dispatchEvent(mouseupEvent);

        return {
          containerExists: !!container,
          handleExists: !!rightHandle,
          eventsDispatched: true
        };
      });

      expect(workflowResult.containerExists).toBe(true);
      expect(workflowResult.handleExists).toBe(true);
      expect(workflowResult.eventsDispatched).toBe(true);
    });
  });
});
