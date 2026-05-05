import CoreData
import Combine

final class CoreDataStack {
    static let shared = CoreDataStack()

    // MARK: - Container

    let persistentContainer: NSPersistentContainer

    private init() {
        persistentContainer = NSPersistentContainer(name: "TamizhiModel")
        persistentContainer.loadPersistentStores { description, error in
            if let error = error {
                fatalError("CoreData failed to load store: \(error.localizedDescription)")
            }
            description.shouldMigrateStoreAutomatically = true
            description.shouldInferMappingModelAutomatically = true
        }
        persistentContainer.viewContext.automaticallyMergesChangesFromParent = true
        persistentContainer.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    }

    // MARK: - Contexts

    /// Main thread context — use for reads / UI binding
    var viewContext: NSManagedObjectContext {
        persistentContainer.viewContext
    }

    /// Background context for writes
    func newBackgroundContext() -> NSManagedObjectContext {
        let ctx = persistentContainer.newBackgroundContext()
        ctx.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
        return ctx
    }

    // MARK: - Save Helpers

    func save(context: NSManagedObjectContext) {
        guard context.hasChanges else { return }
        do {
            try context.save()
        } catch {
            context.rollback()
            print("CoreData save error: \(error)")
        }
    }

    func saveViewContext() {
        save(context: viewContext)
    }

    /// Perform a write on a background context
    func performBackgroundTask(_ block: @escaping (NSManagedObjectContext) -> Void) {
        persistentContainer.performBackgroundTask { ctx in
            ctx.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
            block(ctx)
            if ctx.hasChanges {
                do { try ctx.save() } catch { print("Background save error: \(error)") }
            }
        }
    }

    // MARK: - Fetch Helpers

    func fetch<T: NSManagedObject>(_ request: NSFetchRequest<T>) -> [T] {
        (try? viewContext.fetch(request)) ?? []
    }

    // MARK: - Delete

    func delete(_ object: NSManagedObject, in context: NSManagedObjectContext? = nil) {
        let ctx = context ?? viewContext
        ctx.delete(object)
        save(context: ctx)
    }
}
