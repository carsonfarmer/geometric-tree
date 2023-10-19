import { UnrolledList } from "./unrolled.ts";
import { assertEquals } from "./test_utils.ts";

// Helper methods that give you more introspection into the list.
function nodeLength<T>(list?: UnrolledList<T>): number {
  if (list === undefined) {
    return 0;
  } else if (list.next === undefined) {
    return 1;
  }
  return 1 + nodeLength(list.next);
}

function repr<T>(list?: UnrolledList<T>): string {
  if (list === undefined) {
    return "";
  } else if (list.next === undefined) {
    return `${list.elements}`;
  }
  return `${list.elements} ${repr(list.next)}`;
}

function newPopulatedList(capacity: number, n: number): UnrolledList<number> {
  const list = new UnrolledList<number>(capacity);
  for (let i = 0; i < n; i++) {
    list.push(i);
  }
  return list;
}

function listLike<T>(list: UnrolledList<T>, ...values: number[]): void {
  let wasError = false;
  values.forEach((wanted, i) => {
    const value = list.at(i);
    if (value !== wanted) {
      wasError = true;
      console.error(
        `Wrong value for index ${i}: ${value} (should be ${wanted}).`,
      );
    }
  });

  if (wasError) {
    console.error(`(${repr(list)})`);
  }
}

Deno.test({
  name: "pushOneNode",
  fn(): void {
    const list = newPopulatedList(10, 5);
    listLike(list, 0, 1, 2, 3, 4);
  },
});

Deno.test({
  name: "moreNodes",
  fn(): void {
    const list = newPopulatedList(3, 5);
    listLike(list, 0, 1, 2, 3, 4);
  },
});

Deno.test({
  name: "downcaseInsert",
  fn(): void {
    const sl = [0, 2];
    const result = UnrolledList.insert(sl, 1, 1);
    assertEquals(result, [0, 1, 2]);
  },
});

Deno.test({
  name: "insertOneNode",
  fn(): void {
    const list = new UnrolledList(5);
    list.push(0);
    list.push(2);
    list.insert(1, 1);
    listLike(list, 0, 1, 2);
  },
});

Deno.test({
  name: "insertIntoLastNode",
  fn(): void {
    const list = newPopulatedList(4, 7);
    list.insert(6, 1000);
    listLike(list, 0, 1, 2, 3, 4, 5, 1000, 6);
  },
});

Deno.test({
  name: "insertIntoMiddleNode",
  fn(): void {
    const list = newPopulatedList(3, 7);
    list.insert(3, 1000);
    listLike(list, 0, 1, 2, 1000, 3, 4, 5, 6);
  },
});

// func TestInsertOutOfBounds(t *testing.T) {
// 	list := New(3)
// 	if err := list.Insert(100, 1); err == nil {
// 		t.Error("Out of bound insert didn't return an error.")
// 	}
// }

Deno.test({
  name: "iteration",
  fn(): void {
    const list = newPopulatedList(3, 10);
    let wanted = 0;
    for (const el of list) {
      assertEquals(el, wanted, `Wanted ${wanted}, got ${el}`);
      wanted++;
    }
    assertEquals(
      wanted,
      10,
      `Iter was supposed to yield 10 times, yielded ${wanted}`,
    );
  },
});

Deno.test({
  name: "iterable",
  fn(): void {
    const list = newPopulatedList(3, 10);
    const iter = list[Symbol.iterator]();
    let wanted = 0;
    let el = iter.next();
    while (!el.done) {
      assertEquals(el.value, wanted, `Wanted ${wanted}, got ${el}`);
      wanted++;
      el = iter.next();
    }
    assertEquals(
      wanted,
      10,
      `Iter was supposed to yield 10 times, yielded ${wanted}`,
    );
  },
});

Deno.test({
  name: "sliceDelete",
  fn(): void {
    const arr = [0, 1, 2];
    const [el, newArr] = UnrolledList.splice(arr, 1);
    assertEquals(el, 1);
    assertEquals(newArr, [0, 2]);
  },
});

Deno.test({
  name: "popSimple",
  fn(): void {
    const list = newPopulatedList(5, 3);
    const initialNodeLength = nodeLength(list);
    const el = list.remove(1);
    assertEquals(el, 1);
    listLike(list, 0, 2);
    assertEquals(nodeLength(list), initialNodeLength);
  },
});

Deno.test({
  name: "popNotInFirstNode",
  fn(): void {
    const list = newPopulatedList(3, 10);
    const initialNodeLength = nodeLength(list);
    const el = list.remove(5);
    assertEquals(el, 5);
    listLike(list, 0, 1, 2, 3, 4, 6, 7, 8, 9);
    assertEquals(nodeLength(list), initialNodeLength);
  },
});

Deno.test({
  name: "popNodeMoveElementsFromAdjacent",
  fn(): void {
    const list = newPopulatedList(4, 8);
    for (let i = 0; i < 3; i++) {
      list.pop();
    }
    assertEquals(list.elements.length, 2);
    assertEquals(list.next?.elements.length, 3);
    listLike(list, 3, 4, 5, 6, 7);
  },
});

Deno.test({
  name: "popNodeMoveElementsWithMerge",
  fn(): void {
    const list = newPopulatedList(4, 12);
    const initialNodeLength = nodeLength(list);
    assertEquals(initialNodeLength, 3);

    for (let i = 0; i < 4; i++) {
      list.pop();
    }
    assertEquals(nodeLength(list), 2);
    assertEquals(list.elements.length, 4);
    assertEquals(list.next?.elements.length, 4);
    listLike(list, 4, 5, 6, 7, 8, 9, 10, 11);
  },
});

Deno.test({
  name: "outOfBounds",
  fn(): void {
    let list = newPopulatedList(3, 10);
    const el1 = list.remove(100);
    assertEquals(el1, undefined, "Out of bound element should be undefined.");

    list = newPopulatedList(3, 1);
    const el2 = list.remove(1);
    assertEquals(el2, undefined, "Out of bound element should be undefined.");
  },
});

Deno.test({
  name: "len",
  fn(): void {
    const list = new UnrolledList(3);
    assertEquals(list.length, 0);

    for (let i = 0; i < 10; i++) {
      list.push(i);
    }
    assertEquals(list.length, 10);
  },
});

Deno.test({
  name: "pushBackReallyAppends",
  fn(): void {
    const list = newPopulatedList(5, 10);
    list.pop();
    list.pop();
    const initialNodeLength = nodeLength(list);
    assertEquals(initialNodeLength, 2);

    list.push(1000);
    listLike(list, 2, 3, 4, 5, 6, 7, 8, 9, 1000);
  },
});

Deno.test({
  name: "outOfBoundsAt",
  fn(): void {
    const list = newPopulatedList(5, 5);
    assertEquals(list.at(100), undefined);
  },
});

Deno.test({
  name: "findIndex",
  fn(): void {
    const list = newPopulatedList(5, 5);
    assertEquals(list.findIndex((i) => i === 2), 2);
    assertEquals(list.findIndex((i) => i === 100), -1);
  },
});

Deno.test({
  name: "join",
  fn(): void {
    const a = newPopulatedList(5, 5);
    const b = newPopulatedList(5, 7);
    const c = UnrolledList.join(a, b);
    const d = a.clone();
    d.next = b.clone();
    assertEquals(c, d);
    assertEquals([...c], [0, 1, 2, 3, 4, 0, 1, 2, 3, 4, 5, 6]);
  },
});

Deno.test({
  name: "split",
  fn(): void {
    const a = newPopulatedList(5, 5);
    const b = newPopulatedList(5, 7);
    const c = UnrolledList.join(a, b);
    const [e, d] = UnrolledList.split(c, 5);
    e.next = undefined;
    assertEquals(d, b);
    assertEquals(e, a);
    assertEquals([...d], [0, 1, 2, 3, 4, 5, 6]);
  },
});
